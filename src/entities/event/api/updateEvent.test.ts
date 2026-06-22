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

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

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

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    await updateEvent('1', { title: 'Updated' });

    expect(mockUpdate).toHaveBeenCalledWith({
      title: 'Updated',
    });
  });

  it('should fetch existing event_date and compute end_date when endTime is set without date/time', async () => {
    // Simulates the AI helper calling updateEvent('e1', { endTime: '22:00' })
    // The supabase mock needs to handle two chains:
    //   1. from('events').select('event_date').eq('id', 'e1').single() → fetch existing row
    //   2. from('events').update({...}).eq('id', 'e1').select().single() → perform update

    const mockUpdateSingle = vi.fn().mockResolvedValue({ data: { id: 'e1' }, error: null });
    const mockUpdateSelect = vi.fn().mockReturnValue({ single: mockUpdateSingle });
    const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    const mockFetchSingle = vi.fn().mockResolvedValue({ data: { event_date: '2026-06-01T20:00:00' }, error: null });
    const mockFetchEq = vi.fn().mockReturnValue({ single: mockFetchSingle });
    const mockFetchSelect = vi.fn().mockReturnValue({ eq: mockFetchEq });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: mockFetchSelect,
            update: mockUpdate,
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    await updateEvent('e1', { endTime: '22:00' });

    // Should have fetched the existing event_date
    expect(mockFetchSelect).toHaveBeenCalledWith('event_date');
    expect(mockFetchEq).toHaveBeenCalledWith('id', 'e1');

    // end time 22:00 > start 20:00 → same day
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ end_date: '2026-06-01T22:00:00' }),
    );
  });

  it('should roll end_date to next day when endTime is earlier than stored start time', async () => {
    // endTime '01:00' with stored start '20:00' → next day
    const mockUpdateSingle = vi.fn().mockResolvedValue({ data: { id: 'e1' }, error: null });
    const mockUpdateSelect = vi.fn().mockReturnValue({ single: mockUpdateSingle });
    const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    const mockFetchSingle = vi.fn().mockResolvedValue({ data: { event_date: '2026-06-01T20:00:00' }, error: null });
    const mockFetchEq = vi.fn().mockReturnValue({ single: mockFetchSingle });
    const mockFetchSelect = vi.fn().mockReturnValue({ eq: mockFetchEq });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: mockFetchSelect,
            update: mockUpdate,
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    await updateEvent('e1', { endTime: '01:00' });

    // end time 01:00 < start 20:00 → rolls to next day
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ end_date: '2026-06-02T01:00:00' }),
    );
  });

  it('should clear end_date when endTime is empty string (no date/time provided)', async () => {
    const mockUpdateSingle = vi.fn().mockResolvedValue({ data: { id: 'e1' }, error: null });
    const mockUpdateSelect = vi.fn().mockReturnValue({ single: mockUpdateSingle });
    const mockUpdateEq = vi.fn().mockReturnValue({ select: mockUpdateSelect });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    const mockFetchSingle = vi.fn().mockResolvedValue({ data: { event_date: '2026-06-01T20:00:00' }, error: null });
    const mockFetchEq = vi.fn().mockReturnValue({ single: mockFetchSingle });
    const mockFetchSelect = vi.fn().mockReturnValue({ eq: mockFetchEq });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') {
          return {
            select: mockFetchSelect,
            update: mockUpdate,
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    await updateEvent('e1', { endTime: '' });

    // buildEndDate with '' returns null → clears end_date
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ end_date: null }),
    );
  });
});
