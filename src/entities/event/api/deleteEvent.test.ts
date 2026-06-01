import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteEvent } from './deleteEvent';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('deleteEvent', () => {
  it('returns true on success', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ delete: del }) } as never);

    const result = await deleteEvent('e1');
    expect(result).toBe(true);
    expect(eq).toHaveBeenCalledWith('id', 'e1');
  });

  it('throws on supabase error', async () => {
    const eq = vi.fn().mockResolvedValue({ error: new Error('delete failed') });
    const del = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ delete: del }) } as never);

    await expect(deleteEvent('e1')).rejects.toThrow('delete failed');
  });
});
