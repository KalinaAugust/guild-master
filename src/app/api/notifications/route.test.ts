import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
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
const useFrom = (from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue({ from } as never);

beforeEach(() => vi.clearAllMocks());

describe('GET /api/notifications', () => {
  it('returns 500 on db error', async () => {
    useFrom(vi.fn().mockReturnValue(query({ data: null, error: { message: 'boom' } })));
    expect((await GET()).status).toBe(500);
  });

  it('returns an empty array when there are no notifications', async () => {
    useFrom(vi.fn().mockReturnValue(query({ data: [] })));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('enriches event notifications with event + guild data', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: [
        { id: 'n1', type: 'event_join_request', entity_type: 'event', entity_id: 'e1', is_read: false, created_at: 't' },
      ] }))
      .mockReturnValueOnce(query({ data: [
        { id: 'e1', title: 'Raid', event_date: 'd', guilds: { name: 'Alpha' } },
      ] }));
    useFrom(from);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json[0].event_title).toBe('Raid');
    expect(json[0].guild_name).toBe('Alpha');
  });
});
