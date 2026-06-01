import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventParticipantUserIds } from './getEventParticipantUserIds';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('getEventParticipantUserIds', () => {
  it('returns array of user ids', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [{ user_id: 'u1' }, { user_id: 'u2' }], error: null });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) } as never);

    const result = await getEventParticipantUserIds('e1');
    expect(result).toEqual(['u1', 'u2']);
    expect(eq).toHaveBeenCalledWith('event_id', 'e1');
  });

  it('returns empty array when no participants', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) } as never);

    const result = await getEventParticipantUserIds('e1');
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: new Error('db fail') });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) } as never);

    await expect(getEventParticipantUserIds('e1')).rejects.toThrow('db fail');
  });

  it('handles null data gracefully', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) } as never);

    const result = await getEventParticipantUserIds('e1');
    expect(result).toEqual([]);
  });
});
