import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateFullName } from './updateFullName';
import { createClient } from '@/shared/api/supabase/client';

vi.mock('@/shared/api/supabase/client', () => ({
  createClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('updateFullName', () => {
  it('updates full_name for the given userId', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockReturnValue({ from: vi.fn().mockReturnValue({ update }) } as never);

    await updateFullName('u1', 'Jane Doe');
    expect(update).toHaveBeenCalledWith({ full_name: 'Jane Doe' });
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('throws on supabase error', async () => {
    const eq = vi.fn().mockResolvedValue({ error: new Error('update failed') });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockReturnValue({ from: vi.fn().mockReturnValue({ update }) } as never);

    await expect(updateFullName('u1', 'Jane Doe')).rejects.toThrow('update failed');
  });
});
