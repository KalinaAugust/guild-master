import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCreateEvent } from './executeCreateEvent';
import { createEvent } from '@/entities/event/api/createEvent';
import { executeAddParticipants } from './executeAddParticipants';

vi.mock('@/entities/event/api/createEvent');
vi.mock('./executeAddParticipants');

const args = {
  title: 'Dragon Raid',
  date: '2026-06-01',
  time: '20:00',
  type: 'game' as const,
  description: 'Bring potions',
};

describe('executeCreateEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns success with eventId on success', async () => {
    vi.mocked(createEvent).mockResolvedValue({ id: 'e1' } as never);
    const result = await executeCreateEvent(args, 'g1');
    expect(result).toEqual({ success: true, eventId: 'e1' });
  });

  it('calls createEvent with correct arguments', async () => {
    vi.mocked(createEvent).mockResolvedValue({ id: 'e1' } as never);
    await executeCreateEvent(args, 'g1');
    expect(createEvent).toHaveBeenCalledWith({
      title: 'Dragon Raid',
      date: '2026-06-01',
      time: '20:00',
      type: 'game',
      description: 'Bring potions',
      guild_id: 'g1',
    });
  });

  it('forwards weekDays to createEvent for recurring events', async () => {
    vi.mocked(createEvent).mockResolvedValue({ id: 'e1' } as never);
    await executeCreateEvent({ ...args, weekDays: [1, 3, 5] }, 'g1');
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ weekDays: [1, 3, 5] }));
  });

  it('returns error on failure', async () => {
    vi.mocked(createEvent).mockRejectedValue(new Error('db error'));
    const result = await executeCreateEvent(args, 'g1');
    expect(result).toEqual({ success: false, error: 'db error' });
  });

  it('returns Unknown error for non-Error throws', async () => {
    vi.mocked(createEvent).mockRejectedValue('something weird');
    const result = await executeCreateEvent(args, 'g1');
    expect(result).toEqual({ success: false, error: 'Unknown error' });
  });

  it('calls createEvent with weekDays when provided', async () => {
    vi.mocked(createEvent).mockResolvedValue({ id: 'e1' } as never);
    const argsWithWeekDays = { ...args, weekDays: [1, 3, 5] };
    await executeCreateEvent(argsWithWeekDays, 'g1');
    expect(createEvent).toHaveBeenCalledWith({
      title: 'Dragon Raid',
      date: '2026-06-01',
      time: '20:00',
      type: 'game',
      description: 'Bring potions',
      guild_id: 'g1',
      weekDays: [1, 3, 5],
    });
  });

  it('adds participants when userIds provided', async () => {
    vi.mocked(createEvent).mockResolvedValue({ id: 'e1' } as never);
    vi.mocked(executeAddParticipants).mockResolvedValue({ success: true, eventId: 'e1', addedCount: 2 });
    const result = await executeCreateEvent({ ...args, userIds: ['u1', 'u2'] }, 'g1');
    expect(executeAddParticipants).toHaveBeenCalledWith({ eventId: 'e1', userIds: ['u1', 'u2'] }, 'g1');
    expect(result).toEqual({ success: true, eventId: 'e1' });
  });

  it('does not call executeAddParticipants when userIds is empty', async () => {
    vi.mocked(createEvent).mockResolvedValue({ id: 'e1' } as never);
    await executeCreateEvent({ ...args, userIds: [] }, 'g1');
    expect(executeAddParticipants).not.toHaveBeenCalled();
  });

  it('still returns success when adding participants fails', async () => {
    vi.mocked(createEvent).mockResolvedValue({ id: 'e1' } as never);
    vi.mocked(executeAddParticipants).mockResolvedValue({ success: false, error: 'boom' });
    const result = await executeCreateEvent({ ...args, userIds: ['u1'] }, 'g1');
    expect(result).toEqual({ success: true, eventId: 'e1' });
  });

  it('forwards endTime to createEvent', async () => {
    vi.mocked(createEvent).mockResolvedValue({ id: 'e1' } as never);
    await executeCreateEvent(
      { title: 'T', date: '2026-06-22', time: '19:00', type: 'game', description: '', endTime: '21:00' },
      'guild-1',
    );
    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ endTime: '21:00' }));
  });
});
