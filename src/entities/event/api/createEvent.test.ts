import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEvent } from './createEvent';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

function makeSupabase(insertResult: unknown, userId = 'u1') {
  const single = vi.fn().mockResolvedValue(insertResult);
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
    from: vi.fn().mockReturnValue({ insert }),
    _insert: insert,
    _single: single,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('createEvent', () => {
  it('inserts event and returns data', async () => {
    const row = { id: 'e1', title: 'Raid', event_date: '2026-06-01T20:00:00', guild_id: 'g1' };
    const mock = makeSupabase({ data: row, error: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const result = await createEvent({
      title: 'Raid',
      date: '2026-06-01',
      time: '20:00',
      type: 'game',
      description: 'Bring potions',
      guild_id: 'g1',
    });

    expect(result).toEqual(row);
    expect(mock.from).toHaveBeenCalledWith('events');
    expect(mock._insert).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'Raid',
        event_date: '2026-06-01T20:00:00',
        guild_id: 'g1',
        created_by: 'u1',
      }),
    ]);
  });

  it('throws on supabase error', async () => {
    const mock = makeSupabase({ data: null, error: new Error('db fail') });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await expect(
      createEvent({ title: 'Raid', date: '2026-06-01', time: '20:00', type: 'game', description: '', guild_id: 'g1' })
    ).rejects.toThrow('db fail');
  });
});
