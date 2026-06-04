import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server');
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
function client(user: { id: string; user_metadata?: Record<string, unknown> } | null, from: ReturnType<typeof vi.fn>) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) }, from };
}
const use = (user: Parameters<typeof client>[0], from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(client(user, from) as never);
const body = (b: unknown) => ({ json: () => Promise.resolve(b) }) as never;

beforeEach(() => vi.clearAllMocks());

describe('GET /api/guilds', () => {
  it('returns 401 when unauthenticated', async () => {
    use(null, vi.fn());
    expect((await GET()).status).toBe(401);
  });
  it('maps the user\'s guilds', async () => {
    use({ id: 'u1' }, vi.fn().mockReturnValue(query({ data: [
      { guild_id: 'g1', guilds: { id: 'g1', name: 'Alpha', owner_id: 'u1', description: null } },
    ] })));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'g1', name: 'Alpha', ownerId: 'u1' }]);
  });
  it('returns 500 on db error', async () => {
    use({ id: 'u1' }, vi.fn().mockReturnValue(query({ data: null, error: { message: 'boom' } })));
    expect((await GET()).status).toBe(500);
  });
});

describe('POST /api/guilds', () => {
  it('returns 401 when unauthenticated', async () => {
    use(null, vi.fn());
    expect((await POST(body({ name: 'X' }))).status).toBe(401);
  });
  it('returns 400 when name is missing', async () => {
    use({ id: 'u1' }, vi.fn());
    expect((await POST(body({}))).status).toBe(400);
  });
  it('returns 403 when the guild limit is reached', async () => {
    use({ id: 'u1' }, vi.fn().mockReturnValue(query({ count: 10, error: null })));
    expect((await POST(body({ name: 'X' }))).status).toBe(403);
  });
  it('creates the guild and returns 201', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ count: 0, error: null }))                                  // limit check
      .mockReturnValueOnce(query({ error: null }))                                            // profiles upsert
      .mockReturnValueOnce(query({ data: { id: 'g9', name: 'X', owner_id: 'u1', description: null } })) // insert guild
      .mockReturnValueOnce(query({ error: null }));                                           // member insert
    use({ id: 'u1' }, from);
    const res = await POST(body({ name: 'X' }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'g9', name: 'X', ownerId: 'u1' });
  });
  it('returns 500 when guild insert fails', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ count: 0, error: null }))
      .mockReturnValueOnce(query({ error: null }))
      .mockReturnValueOnce(query({ data: null, error: { message: 'boom' } }));
    use({ id: 'u1' }, from);
    expect((await POST(body({ name: 'X' }))).status).toBe(500);
  });
});
