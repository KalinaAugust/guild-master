import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { POST } from './route';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';

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

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const postReq = (body: unknown) => ({ json: () => Promise.resolve(body) }) as never;

function authed(from: ReturnType<typeof vi.fn>, rpc: ReturnType<typeof vi.fn>) {
  vi.mocked(requireUser).mockResolvedValue({
    ok: true,
    supabase: { from, rpc } as never,
    user: { id: 'owner1' } as never,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireGuildOwner).mockResolvedValue(null); // owner by default
});

describe('POST /api/guilds/[id]/transfer-ownership', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await POST(postReq({ newOwnerId: 'u2' }), params('g1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when the caller is not the owner', async () => {
    authed(vi.fn(), vi.fn());
    vi.mocked(requireGuildOwner).mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );
    const res = await POST(postReq({ newOwnerId: 'u2' }), params('g1'));
    expect(res.status).toBe(403);
    expect(requireGuildOwner).toHaveBeenCalledWith(expect.anything(), 'g1', 'owner1');
  });

  it('returns 400 when newOwnerId is missing', async () => {
    authed(vi.fn(), vi.fn());
    const res = await POST(postReq({}), params('g1'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when newOwnerId is not a string', async () => {
    authed(vi.fn(), vi.fn());
    const res = await POST(postReq({ newOwnerId: 42 }), params('g1'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when the request body is invalid JSON', async () => {
    authed(vi.fn(), vi.fn());
    const badReq = { json: () => Promise.reject(new Error('bad')) } as never;
    const res = await POST(badReq, params('g1'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the target is not a member', async () => {
    authed(vi.fn().mockReturnValue(query({ data: null })), vi.fn());
    const res = await POST(postReq({ newOwnerId: 'u2' }), params('g1'));
    expect(res.status).toBe(404);
  });

  it('transfers ownership and returns 200', async () => {
    const from = vi.fn().mockReturnValue(query({ data: { role: 'MEMBER' } }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    authed(from, rpc);
    const res = await POST(postReq({ newOwnerId: 'u2' }), params('g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(rpc).toHaveBeenCalledWith('transfer_guild_ownership', {
      p_guild_id: 'g1',
      p_new_owner_id: 'u2',
    });
  });

  it('returns 500 when the RPC fails', async () => {
    const from = vi.fn().mockReturnValue(query({ data: { role: 'MEMBER' } }));
    const rpc = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    authed(from, rpc);
    const res = await POST(postReq({ newOwnerId: 'u2' }), params('g1'));
    expect(res.status).toBe(500);
  });
});
