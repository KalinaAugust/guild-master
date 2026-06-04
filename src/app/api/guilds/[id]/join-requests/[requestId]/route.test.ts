import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { PATCH } from './route';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';
import { createAdminClient } from '@/shared/api/supabase/admin';

vi.mock('@/shared/api/guildAuth');
vi.mock('@/shared/api/supabase/admin');

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

const params = (id: string, requestId: string) => ({ params: Promise.resolve({ id, requestId }) });
const patchReq = (body: unknown) => ({ json: () => Promise.resolve(body) }) as never;

function authed(from: ReturnType<typeof vi.fn>) {
  vi.mocked(requireUser).mockResolvedValue({
    ok: true, supabase: { from } as never, user: { id: 'owner1' } as never,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireGuildOwner).mockResolvedValue(null);
  vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => query({ error: null })) } as never);
});

describe('PATCH /api/guilds/[id]/join-requests/[requestId]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    expect((await PATCH(patchReq({ action: 'approve' }), params('g1', 'r1'))).status).toBe(401);
  });

  it('returns 403 when caller is not the owner', async () => {
    authed(vi.fn());
    vi.mocked(requireGuildOwner).mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    expect((await PATCH(patchReq({ action: 'approve' }), params('g1', 'r1'))).status).toBe(403);
  });

  it('returns 400 for an invalid action', async () => {
    authed(vi.fn());
    expect((await PATCH(patchReq({ action: 'nope' }), params('g1', 'r1'))).status).toBe(400);
  });

  it('returns 404 when the pending request does not exist', async () => {
    authed(vi.fn().mockReturnValue(query({ data: null })));
    expect((await PATCH(patchReq({ action: 'approve' }), params('g1', 'r1'))).status).toBe(404);
  });

  it('approves: inserts member, updates request, returns 200', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { user_id: 'u2' } })) // find request
      .mockReturnValueOnce(query({ error: null }))             // insert member
      .mockReturnValueOnce(query({ error: null }));            // update request
    authed(from);
    const res = await PATCH(patchReq({ action: 'approve' }), params('g1', 'r1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('declines: updates request without inserting a member', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { user_id: 'u2' } })) // find request
      .mockReturnValueOnce(query({ error: null }));            // update request
    authed(from);
    const res = await PATCH(patchReq({ action: 'decline' }), params('g1', 'r1'));
    expect(res.status).toBe(200);
  });

  it('returns 500 when member insert fails with a non-duplicate error', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { user_id: 'u2' } }))
      .mockReturnValueOnce(query({ error: { message: 'boom' } }));
    authed(from);
    expect((await PATCH(patchReq({ action: 'approve' }), params('g1', 'r1'))).status).toBe(500);
  });
});
