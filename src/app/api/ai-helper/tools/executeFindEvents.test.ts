import { describe, it, expect, vi } from 'vitest';
import { executeFindEvents } from './executeFindEvents';
import { fetchEvents } from '@/entities/event/api/getEvents';

vi.mock('@/entities/event/api/getEvents');

const EVENTS = [
  { id: '1', title: 'Dragon Raid', type: 'raid', event_date: '2026-06-01T18:00:00', description: null },
  { id: '2', title: 'Team Meeting', type: 'meeting', event_date: '2026-06-15T10:00:00', description: 'Weekly sync' },
  { id: '3', title: 'Board Game Night', type: 'game', event_date: '2026-05-20T19:00:00', description: null },
];

describe('executeFindEvents', () => {
  it('returns all events when no filters given', async () => {
    vi.mocked(fetchEvents).mockResolvedValue(EVENTS as never);
    const result = await executeFindEvents({}, 'g1');
    expect('events' in result && result.events).toHaveLength(3);
  });

  it('filters by dateFrom (inclusive)', async () => {
    vi.mocked(fetchEvents).mockResolvedValue(EVENTS as never);
    const result = await executeFindEvents({ dateFrom: '2026-06-01' }, 'g1');
    expect('events' in result && result.events).toHaveLength(2);
    expect('events' in result && result.events.map((e: { id: string }) => e.id)).toEqual(['1', '2']);
  });

  it('filters by dateTo (inclusive)', async () => {
    vi.mocked(fetchEvents).mockResolvedValue(EVENTS as never);
    const result = await executeFindEvents({ dateTo: '2026-05-31' }, 'g1');
    expect('events' in result && result.events).toHaveLength(1);
    expect('events' in result && result.events[0].id).toBe('3');
  });

  it('filters by type', async () => {
    vi.mocked(fetchEvents).mockResolvedValue(EVENTS as never);
    const result = await executeFindEvents({ type: 'raid' }, 'g1');
    expect('events' in result && result.events).toHaveLength(1);
    expect('events' in result && result.events[0].id).toBe('1');
  });

  it('filters by keyword (case-insensitive)', async () => {
    vi.mocked(fetchEvents).mockResolvedValue(EVENTS as never);
    const result = await executeFindEvents({ keyword: 'dragon' }, 'g1');
    expect('events' in result && result.events).toHaveLength(1);
    expect('events' in result && result.events[0].id).toBe('1');
  });

  it('combines multiple filters', async () => {
    vi.mocked(fetchEvents).mockResolvedValue(EVENTS as never);
    const result = await executeFindEvents({ dateFrom: '2026-06-01', type: 'raid' }, 'g1');
    expect('events' in result && result.events).toHaveLength(1);
    expect('events' in result && result.events[0].id).toBe('1');
  });

  it('transforms event_date to separate date and time fields', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([EVENTS[0]] as never);
    const result = await executeFindEvents({}, 'g1');
    if ('events' in result) {
      expect(result.events[0].date).toBe('2026-06-01');
      expect(result.events[0].time).toBe('18:00');
    }
  });

  it('returns error object when fetchEvents throws', async () => {
    vi.mocked(fetchEvents).mockRejectedValue(new Error('db error'));
    const result = await executeFindEvents({}, 'g1');
    expect('error' in result && result.error).toBe('db error');
  });

  it('returns empty array when fetchEvents returns null', async () => {
    vi.mocked(fetchEvents).mockResolvedValue(null as never);
    const result = await executeFindEvents({}, 'g1');
    expect('events' in result && result.events).toHaveLength(0);
  });
});
