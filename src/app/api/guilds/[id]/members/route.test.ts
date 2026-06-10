import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { GET, POST } from './route';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';
import { createAdminClient } from '@/shared/api/supabase/admin';
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';

vi.mock('@/shared/api/guildAuth');
vi.mock('@/shared/api/supabase/admin');
vi.mock('@/entities/guild/api/getGuildMembers');

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

function authed(from: ReturnType<typeof vi.fn>) {
  vi.mocked(requireUser).mockResolvedValue({
    ok: true,
    supabase: { from } as never,
    user: { id: 'admin1' } as never,
  });
}
function adminFindsUser(user: { id: string; email: string } | null) {
  const users = user ? [user] : [];
  vi.mocked(createAdminClient).mockReturnValue({
    auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users }, error: null }) } },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireGuildRole).mockResolvedValue(null);
});

describe('GET /api/guilds/[id]/members', () => {
  it('returns the member list', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue([{ userId: 'u1' }] as never);
    const res = await GET({} as never, params('g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it('returns 500 when the fetch fails', async () => {
    vi.mocked(getGuildMembers).mockRejectedValue(new Error('db'));
    const res = await GET({} as never, params('g1'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/guilds/[id]/members', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await POST(postReq({ email: 'a@b.c' }), params('g1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    authed(vi.fn());
    const res = await POST(postReq({}), params('g1'));
    expect(res.status).toBe(400);
  });

  it('returns 403 when the caller lacks OWNER/ADMIN role', async () => {
    authed(vi.fn());
    vi.mocked(requireGuildRole).mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );
    const res = await POST(postReq({ email: 'a@b.c' }), params('g1'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when no user has that email', async () => {
    authed(vi.fn());
    adminFindsUser(null);
    const res = await POST(postReq({ email: 'ghost@b.c' }), params('g1'));
    expect(res.status).toBe(404);
  });

  it('returns 409 when the user is already a member', async () => {
    authed(vi.fn().mockReturnValue(query({ data: { user_id: 'target' } })));
    adminFindsUser({ id: 'target', email: 'a@b.c' });
    const res = await POST(postReq({ email: 'a@b.c' }), params('g1'));
    expect(res.status).toBe(409);
  });

  it('returns the new member row on success', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: null }))
      .mockReturnValueOnce(query({ error: null }))
      .mockReturnValueOnce(query({
        data: { user_id: 'target', role: 'MEMBER', profiles: { public_id: 'pubT', full_name: 'Bob', avatar_url: null } },
      }));
    authed(from);
    adminFindsUser({ id: 'target', email: 'a@b.c' });
    const res = await POST(postReq({ email: 'a@b.c' }), params('g1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ userId: 'target', role: 'MEMBER', profile: { publicId: 'pubT', fullName: 'Bob', avatarUrl: null } });
  });
});
