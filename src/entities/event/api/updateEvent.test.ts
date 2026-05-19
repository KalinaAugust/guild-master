import { describe, it, expect, vi } from 'vitest';
import { updateEvent } from './updateEvent';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('updateEvent API', () => {
  it('should call supabase.update with correct data', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: '1', title: 'Updated' }, error: null });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as Awaited<ReturnType<typeof createClient>>);

    const result = await updateEvent('1', { title: 'Updated', date: '2026-05-19', time: '19:00' });

    expect(mockSupabase.from).toHaveBeenCalledWith('events');
    expect(mockUpdate).toHaveBeenCalledWith({
      title: 'Updated',
      event_date: '2026-05-19T19:00:00',
    });
    expect(mockEq).toHaveBeenCalledWith('id', '1');
    expect(result).toEqual({ id: '1', title: 'Updated' });
  });

  it('should only include defined fields', async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: '1', title: 'Updated' }, error: null });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as Awaited<ReturnType<typeof createClient>>);

    await updateEvent('1', { title: 'Updated' });

    expect(mockUpdate).toHaveBeenCalledWith({
      title: 'Updated',
    });
  });
});
