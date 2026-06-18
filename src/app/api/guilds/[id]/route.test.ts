import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { GET, PATCH, DELETE } from './route';
import { createClient } from '@/shared/api/supabase/server';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';

vi.mock('@/shared/api/supabase/server');
vi.mock('@/shared/api/guildAuth');
function query(result: { data?: unknown; error?: unknown; count?: number }) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'delete', 'insert', 'update', 'upsert', 'in', 'order', 'limit']) {
    b[m] = vi.fn(() => b);
  }
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (resolve: (v: unknown) => void) => resolve(result);
  return b;
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const body = (b: unknown) => ({ json: () => Promise.resolve(b) }) as never;
const authed = (from: ReturnType<typeof vi.fn>) =>
  vi.mocked(requireUser).mockResolvedValue({ ok: true, supabase: { from } as never, user: { id: 'u1' } as never });
const unauth = () => vi.mocked(requireUser).mockResolvedValue({
  ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireGuildOwner).mockResolvedValue(null);
});

describe('GET /api/guilds/[id]', () => {
  it('returns 404 when the guild is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue(query({ data: null })) } as never);
    expect((await GET({} as never, params('g1'))).status).toBe(404);
  });
  it('returns guild details with member count', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { id: 'g1', public_id: 'g1', name: 'Alpha', description: null, owner_id: 'u1', profiles: { full_name: 'Boss' } } }))
      .mockReturnValueOnce(query({ count: 3 }));
    vi.mocked(createClient).mockResolvedValue({ from } as never);
    const res = await GET({} as never, params('g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 'g1', publicId: 'g1', ownerName: 'Boss', memberCount: 3 });
  });
});

describe('PATCH /api/guilds/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    unauth();
    expect((await PATCH(body({ name: 'X' }), params('g1'))).status).toBe(401);
  });
  it('returns 400 when name is missing', async () => {
    authed(vi.fn());
    expect((await PATCH(body({}), params('g1'))).status).toBe(400);
  });
  it('returns 403 when caller is not the owner', async () => {
    authed(vi.fn());
    vi.mocked(requireGuildOwner).mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    expect((await PATCH(body({ name: 'X' }), params('g1'))).status).toBe(403);
  });
  it('updates and returns the guild', async () => {
    authed(vi.fn().mockReturnValue(query({ data: { id: 'g1', public_id: 'g1', name: 'X', owner_id: 'u1', description: null } })));
    const res = await PATCH(body({ name: 'X' }), params('g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'g1', publicId: 'g1', name: 'X', ownerId: 'u1' });
  });
});

describe('DELETE /api/guilds/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    unauth();
    expect((await DELETE({} as never, params('g1'))).status).toBe(401);
  });
  it('returns 403 when caller is not the owner', async () => {
    authed(vi.fn());
    vi.mocked(requireGuildOwner).mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    expect((await DELETE({} as never, params('g1'))).status).toBe(403);
  });
  it('deletes and returns success', async () => {
    authed(vi.fn().mockReturnValue(query({ error: null })));
    const res = await DELETE({} as never, params('g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
