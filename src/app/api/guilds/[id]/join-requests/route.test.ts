import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { GET, POST } from './route';
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

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = {} as never;

function authed(from: ReturnType<typeof vi.fn>) {
  vi.mocked(requireUser).mockResolvedValue({
    ok: true, supabase: { from } as never, user: { id: 'u1' } as never,
  });
}
const unauth = () => vi.mocked(requireUser).mockResolvedValue({
  ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireGuildOwner).mockResolvedValue(null);
  vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => query({ error: null })) } as never);
});

describe('GET /api/guilds/[id]/join-requests', () => {
  it('returns 401 when not authenticated', async () => {
    unauth();
    expect((await GET(req, params('g1'))).status).toBe(401);
  });

  it('returns 403 when caller is not the owner', async () => {
    authed(vi.fn());
    vi.mocked(requireGuildOwner).mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    expect((await GET(req, params('g1'))).status).toBe(403);
  });

  it('returns the pending requests for the owner', async () => {
    authed(vi.fn().mockReturnValue(query({
      data: [{ id: 'r1', user_id: 'u2', created_at: 't', profiles: { public_id: 'pub2', full_name: 'Bob', avatar_url: null } }],
    })));
    const res = await GET(req, params('g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'r1', userId: 'u2', publicId: 'pub2', userName: 'Bob', avatarUrl: null, createdAt: 't' }]);
  });

  it('returns 500 on fetch error', async () => {
    authed(vi.fn().mockReturnValue(query({ error: { message: 'boom' } })));
    expect((await GET(req, params('g1'))).status).toBe(500);
  });
});

describe('POST /api/guilds/[id]/join-requests', () => {
  it('returns 401 when not authenticated', async () => {
    unauth();
    expect((await POST(req, params('g1'))).status).toBe(401);
  });

  it('returns 409 when already a member', async () => {
    authed(vi.fn().mockReturnValue(query({ data: { id: 'm1' } })));
    expect((await POST(req, params('g1'))).status).toBe(409);
  });

  it('returns 409 when a request is already pending', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: null }))
      .mockReturnValueOnce(query({ data: { id: 'r1' } }));
    authed(from);
    expect((await POST(req, params('g1'))).status).toBe(409);
  });

  it('creates the request and returns 201', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: null }))
      .mockReturnValueOnce(query({ data: null }))
      .mockReturnValueOnce(query({ data: { id: 'r1', status: 'pending' } }))
      .mockReturnValueOnce(query({ data: { owner_id: 'owner1' } }));
    authed(from);
    const res = await POST(req, params('g1'));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'r1', status: 'pending' });
  });

  it('returns 500 when insert fails', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: null }))
      .mockReturnValueOnce(query({ data: null }))
      .mockReturnValueOnce(query({ data: null, error: { message: 'boom' } }));
    authed(from);
    expect((await POST(req, params('g1'))).status).toBe(500);
  });
});
