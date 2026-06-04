import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { DELETE } from './route';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';

vi.mock('@/shared/api/guildAuth');

/** Chainable Supabase query-builder mock that resolves to `result`. */
function query(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'delete', 'insert', 'update', 'in', 'order']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: unknown) => void) => resolve(result);
  return builder;
}

const params = (id: string, userId: string) => ({ params: Promise.resolve({ id, userId }) });
const req = {} as never;

function authed(from: ReturnType<typeof vi.fn>) {
  vi.mocked(requireUser).mockResolvedValue({
    ok: true,
    supabase: { from } as never,
    user: { id: 'admin1' } as never,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireGuildRole).mockResolvedValue(null); // allowed by default
});

describe('DELETE /api/guilds/[id]/members/[userId]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await DELETE(req, params('g1', 'u2'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when the caller lacks OWNER/ADMIN role', async () => {
    authed(vi.fn());
    vi.mocked(requireGuildRole).mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );
    const res = await DELETE(req, params('g1', 'u2'));
    expect(res.status).toBe(403);
    expect(requireGuildRole).toHaveBeenCalledWith(expect.anything(), 'g1', 'admin1', ['OWNER', 'ADMIN']);
  });

  it('returns 404 when the target is not a member', async () => {
    authed(vi.fn().mockReturnValue(query({ data: null })));
    const res = await DELETE(req, params('g1', 'u2'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when trying to remove the guild owner', async () => {
    authed(vi.fn().mockReturnValue(query({ data: { role: 'OWNER' } })));
    const res = await DELETE(req, params('g1', 'owner1'));
    expect(res.status).toBe(403);
  });

  it('returns 200 and deletes a regular member', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { role: 'MEMBER' } }))
      .mockReturnValueOnce(query({ error: null }));
    authed(from);
    const res = await DELETE(req, params('g1', 'u2'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('returns 500 when the delete fails', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { role: 'MEMBER' } }))
      .mockReturnValueOnce(query({ error: { message: 'boom' } }));
    authed(from);
    const res = await DELETE(req, params('g1', 'u2'));
    expect(res.status).toBe(500);
  });
});
