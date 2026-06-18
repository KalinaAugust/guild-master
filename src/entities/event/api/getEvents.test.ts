import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEvents } from './getEvents';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

function makeSupabase(result: unknown) {
  const order = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  return { from: vi.fn().mockReturnValue({ select }), _eq: eq };
}

describe('fetchEvents', () => {
  it('returns events for guildId', async () => {
    const rows = [{ id: 'e1', public_id: 'pub1', title: 'Raid', event_date: '2026-06-01T20:00:00' }];
    const mock = makeSupabase({ data: rows, error: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await fetchEvents('g1');
    expect(result).toEqual(rows);
    expect(mock._eq).toHaveBeenCalledWith('guild_id', 'g1');
  });

  it('returns empty array when no events', async () => {
    const mock = makeSupabase({ data: [], error: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await fetchEvents('g1');
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    const mock = makeSupabase({ data: null, error: new Error('db fail') });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await expect(fetchEvents('g1')).rejects.toThrow('db fail');
  });
});
