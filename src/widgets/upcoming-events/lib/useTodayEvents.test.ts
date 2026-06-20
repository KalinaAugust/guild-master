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
    const { result } = renderHook(() => useTodayEvents([make('2026-06-02', '10:00')]));
    expect(result.current).toEqual([]);
  });

  it('returns only today events', () => {
    const today = make('2026-06-01', '18:00', 'today');
    const other = make('2026-06-02', '18:00', 'other');
    const { result } = renderHook(() => useTodayEvents([today, other]));
    expect(result.current).toEqual([today]);
  });

  it('sorts today events by time', () => {
    const late = make('2026-06-01', '20:00', 'late');
    const early = make('2026-06-01', '09:00', 'early');
    const { result } = renderHook(() => useTodayEvents([late, early]));
    expect(result.current.map(e => e.id)).toEqual(['early', 'late']);
  });
});
