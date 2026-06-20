import { useMemo } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from '@/shared/lib/dayjs';
import { useWeekdayLabels } from '@/shared/lib/useWeekdayLabels';

export const useCalendarDays = (now: Dayjs) => {
  const weekdayLabels = useWeekdayLabels();

  const DAYS_OF_WEEK = useMemo(() => weekdayLabels.map((label, index) => ({
    key: index === 5 || index === 6 ? (index === 5 ? 'sat' : 'sun') : index.toString(),
    label,
  })), [weekdayLabels]);

  const days = useMemo(() => {
    const startOfMonth = now.startOf('month');

    const dayValue = startOfMonth.day();
    const firstDayOfWeek = dayValue === 0 ? 6 : dayValue - 1;

    const calendarDays = [];

    const prevMonthDate = now.subtract(1, 'month');
    const daysInPrevMonth = prevMonthDate.daysInMonth();
    for (let i = firstDayOfWeek; i > 0; i--) {
      const d = prevMonthDate.date(daysInPrevMonth - i + 1);
      const dayOfWeek = d.day();
      calendarDays.push({
        date: d.date(),
        fullDate: d.format('YYYY-MM-DD'),
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    const daysInMonth = now.daysInMonth();
    const today = dayjs().format('YYYY-MM-DD');
    for (let i = 1; i <= daysInMonth; i++) {
      const d = now.date(i);
      const fullDate = d.format('YYYY-MM-DD');
      const dayOfWeek = d.day();
      calendarDays.push({
        date: i,
        fullDate,
        isCurrentMonth: true,
        isToday: fullDate === today,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    const remaining = Math.ceil(calendarDays.length / 7) * 7 - calendarDays.length;
    const nextMonthDate = now.add(1, 'month');
    for (let i = 1; i <= remaining; i++) {
      const d = nextMonthDate.date(i);
      const dayOfWeek = d.day();
      calendarDays.push({
        date: i,
        fullDate: d.format('YYYY-MM-DD'),
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    return calendarDays;
  }, [now]);

  return { days, DAYS_OF_WEEK };
};