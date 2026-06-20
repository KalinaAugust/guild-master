import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTodayEvents } from './useTodayEvents';
import type { ActivityEvent } from '@/shared/types';

const make = (date: string, time: string, id = '1'): ActivityEvent => ({
  id, title: 'Test', date, time, type: 'game',
});

describe('useTodayEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns empty array when there are no events today', () => {
    const { result } = renderHook(() => useTodayEvents([make('2026-06-02', '10:00')], [], false));
    expect(result.current).toEqual([]);
  });

  it('returns only today events', () => {
    const today = make('2026-06-01', '18:00', 'today');
    const other = make('2026-06-02', '18:00', 'other');
    const { result } = renderHook(() => useTodayEvents([today, other], [], false));
    expect(result.current).toEqual([today]);
  });

  it('sorts today events by time', () => {
    const late = make('2026-06-01', '20:00', 'late');
    const early = make('2026-06-01', '09:00', 'early');
    const { result } = renderHook(() => useTodayEvents([late, early], [], false));
    expect(result.current.map(e => e.id)).toEqual(['early', 'late']);
  });

  it('keeps all today events regardless of participation when not onlyMine', () => {
    const mine = make('2026-06-01', '10:00', 'mine');
    const notMine = make('2026-06-01', '12:00', 'other');
    const { result } = renderHook(() => useTodayEvents([mine, notMine], ['mine'], false));
    expect(result.current.map(e => e.id)).toEqual(['mine', 'other']);
  });

  it('keeps only participating events when onlyMine', () => {
    const mine = make('2026-06-01', '10:00', 'mine');
    const notMine = make('2026-06-01', '12:00', 'other');
    const { result } = renderHook(() => useTodayEvents([mine, notMine], ['mine'], true));
    expect(result.current.map(e => e.id)).toEqual(['mine']);
  });

  it('matches recurring occurrences by base id when onlyMine', () => {
    const occurrence = make('2026-06-01', '10:00', 'base_2026-06-01');
    const { result } = renderHook(() => useTodayEvents([occurrence], ['base'], true));
    expect(result.current.map(e => e.id)).toEqual(['base_2026-06-01']);
  });
});
