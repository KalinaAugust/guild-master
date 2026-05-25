import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks';
import { nextMonth, prevMonth, setViewDate } from '@/entities/calendar';

export const useCalendarNavigation = () => {
  const dispatch = useAppDispatch();
  const viewDateStr = useAppSelector((state) => state.ui.viewDate);
  const locale = useLocale();

  const now = useMemo(() => dayjs(viewDateStr).locale(locale), [viewDateStr, locale]);

  const months = useMemo(() => {
    const localeData = now.localeData();
    return localeData.months().map((label, i) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: i.toString(),
    }));
  }, [now]);

  const years = useMemo(() => Array.from({ length: 21 }, (_, i) => {
    const year = dayjs().year() - 10 + i;
    return { label: year.toString(), value: year.toString() };
  }), []);

  const handlePrevMonth = () => dispatch(prevMonth());
  const handleNextMonth = () => dispatch(nextMonth());

  const handleMonthChange = (month: string) => {
    dispatch(setViewDate(now.month(parseInt(month)).toISOString()));
  };

  const handleYearChange = (year: string) => {
    dispatch(setViewDate(now.year(parseInt(year)).toISOString()));
  };

  return { now, months, years, handlePrevMonth, handleNextMonth, handleMonthChange, handleYearChange };
};