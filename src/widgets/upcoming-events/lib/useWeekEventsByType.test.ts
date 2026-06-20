import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWeekEventsByType } from './useWeekEventsByType';
import type { ActivityEvent } from '@/shared/types';

// Week of 2026-06-01 (Mon) → 2026-06-07 (Sun)
const make = (date: string, type: ActivityEvent['type'] = 'game', id = '1', time = '18:00'): ActivityEvent => ({
  id, title: 'Test', date, time, type,
});

describe('useWeekEventsByType', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T12:00:00')); // Wednesday of that week
  });
  afterEach(() => vi.useRealTimers());

  it('returns empty object when no events', () => {
    const { result } = renderHook(() => useWeekEventsByType([], [], true));
    expect(result.current).toEqual({});
  });

  it('excludes events not in myEventIds when onlyMine', () => {
    const event = make('2026-06-04', 'game', '1');
    const { result } = renderHook(() => useWeekEventsByType([event], [], true));
    expect(result.current).toEqual({});
  });

  it('includes events regardless of myEventIds when not onlyMine', () => {
    const event = make('2026-06-04', 'game', '1');
    const { result } = renderHook(() => useWeekEventsByType([event], [], false));
    expect(result.current.game).toHaveLength(1);
  });

  it('excludes events outside current week', () => {
    const event = make('2026-06-15', 'game', '1');
    const { result } = renderHook(() => useWeekEventsByType([event], ['1'], true));
    expect(result.current).toEqual({});
  });

  it('groups events by type for current week', () => {
    const raid1 = make('2026-06-03', 'game', 'r1'); // Wednesday 18:00 (future)
    const raid2 = make('2026-06-04', 'game', 'r2'); // Thursday 18:00 (future)
    const meeting = make('2026-06-05', 'meeting', 'm1');
    const { result } = renderHook(() =>
      useWeekEventsByType([raid1, raid2, meeting], ['r1', 'r2', 'm1'], true)
    );
    expect(result.current.game).toHaveLength(2);
    expect(result.current.meeting).toHaveLength(1);
    expect(result.current.party).toBeUndefined();
  });

  it('only includes events that are in myEventIds when onlyMine', () => {
    const mine = make('2026-06-03', 'party', 'mine');
    const notMine = make('2026-06-03', 'party', 'other');
    const { result } = renderHook(() =>
      useWeekEventsByType([mine, notMine], ['mine'], true)
    );
    expect(result.current.party).toHaveLength(1);
    expect(result.current.party?.[0].id).toBe('mine');
  });

  it('excludes past events of current week', () => {
    const pastDay = make('2026-06-02', 'game', 'past-day'); // Tuesday 18:00 (past)
    const pastTimeToday = make('2026-06-03', 'game', 'past-today', '10:00'); // Wednesday 10:00 (past)
    const futureToday = make('2026-06-03', 'game', 'future-today', '14:00'); // Wednesday 14:00 (future)
    const futureDay = make('2026-06-04', 'game', 'future-day'); // Thursday 18:00 (future)

    const { result } = renderHook(() =>
      useWeekEventsByType(
        [pastDay, pastTimeToday, futureToday, futureDay],
        ['past-day', 'past-today', 'future-today', 'future-day'],
        true
      )
    );

    expect(result.current.game).toHaveLength(2);
    const ids = result.current.game?.map(e => e.id) ?? [];
    expect(ids).toContain('future-today');
    expect(ids).toContain('future-day');
    expect(ids).not.toContain('past-day');
    expect(ids).not.toContain('past-today');
  });
});
