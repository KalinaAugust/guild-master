import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import dayjs from '@/shared/lib/dayjs';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

vi.mock('@/shared/lib/useWeekdayLabels', () => ({
  useWeekdayLabels: () => ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
}));

import { useCalendarDays } from './useCalendarDays';

describe('useCalendarDays', () => {
  it('returns a whole number of weeks (multiple of 7)', () => {
    const now = dayjs('2026-06-01');
    const { result } = renderHook(() => useCalendarDays(now));
    expect(result.current.days.length % 7).toBe(0);
    expect(result.current.days.length).toBeGreaterThanOrEqual(28);
    expect(result.current.days.length).toBeLessThanOrEqual(42);
  });

  it('marks current month days correctly', () => {
    const now = dayjs('2026-06-01');
    const { result } = renderHook(() => useCalendarDays(now));
    const currentMonthDays = result.current.days.filter((d) => d.isCurrentMonth);
    expect(currentMonthDays).toHaveLength(30);
  });

  it('first day of month is on correct weekday position', () => {
    // June 2026 starts on Monday (index 0 in Mon-first calendar)
    const now = dayjs('2026-06-01');
    const { result } = renderHook(() => useCalendarDays(now));
    const firstCurrent = result.current.days.findIndex((d) => d.isCurrentMonth);
    expect(firstCurrent).toBe(0);
  });

  it('marks Saturday and Sunday as weekend', () => {
    const now = dayjs('2026-06-01');
    const { result } = renderHook(() => useCalendarDays(now));
    const weekends = result.current.days.filter((d) => d.isCurrentMonth && d.isWeekend);
    // June 2026 has 4 Saturdays and 4 Sundays = 8 weekends
    expect(weekends.length).toBeGreaterThan(0);
    for (const day of weekends) {
      const dow = dayjs(day.fullDate).day();
      expect(dow === 0 || dow === 6).toBe(true);
    }
  });

  it('marks today correctly', () => {
    const today = dayjs();
    const { result } = renderHook(() => useCalendarDays(today));
    const todayEntry = result.current.days.find((d) => d.isToday);
    expect(todayEntry).toBeDefined();
    expect(todayEntry?.fullDate).toBe(today.format('YYYY-MM-DD'));
  });

  it('fills prev month days before first of month', () => {
    // May 2026 starts on Friday (index 4) → 4 prev-month days
    const now = dayjs('2026-05-01');
    const { result } = renderHook(() => useCalendarDays(now));
    const prevMonthDays = result.current.days.filter((d) => !d.isCurrentMonth).slice(0, 4);
    expect(prevMonthDays.every((d) => d.fullDate.startsWith('2026-04'))).toBe(true);
  });

  it('returns 7 weekday labels', () => {
    const now = dayjs('2026-06-01');
    const { result } = renderHook(() => useCalendarDays(now));
    expect(result.current.DAYS_OF_WEEK).toHaveLength(7);
  });

  it('fullDate format is YYYY-MM-DD', () => {
    const now = dayjs('2026-06-01');
    const { result } = renderHook(() => useCalendarDays(now));
    for (const day of result.current.days) {
      expect(day.fullDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
