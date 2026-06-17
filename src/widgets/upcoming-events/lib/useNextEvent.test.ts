import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNextEvent } from './useNextEvent';
import type { ActivityEvent } from '@/shared/types';

const make = (date: string, time: string, id = '1'): ActivityEvent => ({
  id, title: 'Test', date, time, type: 'game',
});

describe('useNextEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns null for empty array', () => {
    const { result } = renderHook(() => useNextEvent([]));
    expect(result.current).toBeNull();
  });

  it('returns null when all events are in the past', () => {
    const { result } = renderHook(() => useNextEvent([make('2026-05-31', '10:00')]));
    expect(result.current).toBeNull();
  });

  it('returns the single future event', () => {
    const event = make('2026-06-02', '18:00');
    const { result } = renderHook(() => useNextEvent([event]));
    expect(result.current).toBe(event);
  });

  it('returns the earliest of multiple future events', () => {
    const later = make('2026-06-10', '20:00', '2');
    const sooner = make('2026-06-03', '09:00', '1');
    const { result } = renderHook(() => useNextEvent([later, sooner]));
    expect(result.current).toBe(sooner);
  });

  it('ignores past events when future ones exist', () => {
    const past = make('2026-05-30', '18:00', 'past');
    const future = make('2026-06-05', '18:00', 'future');
    const { result } = renderHook(() => useNextEvent([past, future]));
    expect(result.current).toBe(future);
  });
});
