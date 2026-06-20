import { useMemo } from 'react';
import dayjs from '@/shared/lib/dayjs';
import type { ActivityEvent } from '@/shared/types';

export const useTodayEvents = (events: ActivityEvent[]): ActivityEvent[] =>
  useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    return events
      .filter(e => e.date === today)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [events]);
