import { useMemo } from 'react';
import dayjs from '@/shared/lib/dayjs';
import type { ActivityEvent } from '@/shared/types';

export const useNextEvent = (events: ActivityEvent[]): ActivityEvent | null =>
  useMemo(() => {
    const now = dayjs();
    const future = events.filter(e => dayjs(`${e.date}T${e.time}`).isAfter(now));
    if (future.length === 0) return null;
    return future.reduce((a, b) =>
      dayjs(`${a.date}T${a.time}`).isBefore(dayjs(`${b.date}T${b.time}`)) ? a : b
    );
  }, [events]);
