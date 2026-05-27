import { describe, it, expect, vi } from 'vitest';
import { executeEditEvent } from './executeEditEvent';
import { updateEvent } from '@/entities/event/api/updateEvent';

vi.mock('@/entities/event/api/updateEvent');

describe('executeEditEvent', () => {
  it('calls updateEvent with id and title', async () => {
    vi.mocked(updateEvent).mockResolvedValue({ id: 'e1', title: 'New Name' } as never);
    const result = await executeEditEvent({ id: 'e1', title: 'New Name' });
    expect(updateEvent).toHaveBeenCalledWith('e1', { title: 'New Name' });
    expect(result).toEqual({ success: true, eventId: 'e1' });
  });

  it('passes only provided optional fields', async () => {
    vi.mocked(updateEvent).mockResolvedValue({ id: 'e1' } as never);
    await executeEditEvent({ id: 'e1', date: '2026-07-01', time: '18:00' });
    expect(updateEvent).toHaveBeenCalledWith('e1', { date: '2026-07-01', time: '18:00' });
  });

  it('returns error when updateEvent throws', async () => {
    vi.mocked(updateEvent).mockRejectedValue(new Error('db error'));
    const result = await executeEditEvent({ id: 'e1', title: 'Test' });
    expect(result).toEqual({ success: false, error: 'db error' });
  });
});
