import dayjs from '@/shared/lib/dayjs';

/**
 * Build the absolute end timestamp for an event.
 * `endTime === ''` means no end. When end <= start it is treated as next day.
 */
export const buildEndDate = (
  date: string,
  time: string,
  endTime: string,
): string | null => {
  if (!endTime) return null;
  const rollsOver = endTime <= time; // HH:mm strings compare lexicographically
  const endDate = rollsOver ? dayjs(date).add(1, 'day').format('YYYY-MM-DD') : date;
  return `${endDate}T${endTime}:00`;
};

/** Derive the client-facing end fields from stored timestamps (UTC). */
export const deriveEnd = (
  eventDate: string,
  endDate: string | null,
): { endTime?: string; endsNextDay?: boolean } => {
  if (!endDate) return {};
  const start = dayjs.utc(eventDate);
  const end = dayjs.utc(endDate);
  return {
    endTime: end.format('HH:mm'),
    endsNextDay: !end.isSame(start, 'day'),
  };
};
