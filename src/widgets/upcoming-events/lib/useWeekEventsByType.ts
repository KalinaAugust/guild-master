import { useMemo } from 'react';
import dayjs from '@/shared/lib/dayjs';
import type { ActivityEvent, ActivityType } from '@/shared/types';

export const useWeekEventsByType = (
  events: ActivityEvent[],
  myEventIds: string[]
): Partial<Record<ActivityType, ActivityEvent[]>> =>
  useMemo(() => {
    const now = dayjs();
    const endOfWeek = dayjs().endOf('isoWeek');
    const myIdSet = new Set(myEventIds);

    return events
      .filter(e => {
        const eventTime = dayjs(`${e.date}T${e.time}`);
        return myIdSet.has(e.id.split('_')[0]) && eventTime.isAfter(now) && !eventTime.isAfter(endOfWeek);
      })
      .reduce<Partial<Record<ActivityType, ActivityEvent[]>>>((acc, e) => {
        if (!acc[e.type]) acc[e.type] = [];
        acc[e.type]!.push(e);
        return acc;
      }, {});
  }, [events, myEventIds]);
