import { useMemo } from 'react';
import dayjs from '@/shared/lib/dayjs';
import type { ActivityEvent } from '@/shared/types';

export const useTodayEvents = (
  events: ActivityEvent[],
  myEventIds: string[],
  onlyMine: boolean
): ActivityEvent[] =>
  useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const myIdSet = new Set(myEventIds);
    return events
      .filter(e => e.date === today && (!onlyMine || myIdSet.has(e.id.split('_')[0])))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [events, myEventIds, onlyMine]);
