import dayjs from './dayjs';

/**
 * Returns a relative day representation (e.g. "Today", "Tomorrow", or formatted date "D MMM").
 * 
 * @param date - The target date string.
 * @param todayLabel - Localized label for "Today".
 * @param tomorrowLabel - Localized label for "Tomorrow".
 * @returns Relative day string.
 */
export const getRelativeDay = (date: string, todayLabel: string, tomorrowLabel: string): string => {
  const diff = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (diff === 0) return todayLabel;
  if (diff === 1) return tomorrowLabel;
  return dayjs(date).format('D MMM');
};
