import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import dayjs from './dayjs';

export const useWeekdayLabels = (): string[] => {
  const locale = useLocale();
  return useMemo(() => {
    const localeData = dayjs().locale(locale).localeData();
    const weekdays = localeData.weekdaysMin();
    const shifted = [...weekdays.slice(1), weekdays[0]];
    return shifted.map(label => label.charAt(0).toUpperCase() + label.slice(1));
  }, [locale]);
};
