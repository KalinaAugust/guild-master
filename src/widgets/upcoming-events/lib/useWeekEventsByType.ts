import { useMemo } from 'react';
import dayjs from '@/shared/lib/dayjs';
import type { ActivityEvent, ActivityType } from '@/shared/types';

export const useWeekEventsByType = (
  events: ActivityEvent[],
  myEventIds: string[]
): Partial<Record<ActivityType, ActivityEvent[]>> =>
  useMemo(() => {
    const startOfWeek = dayjs().startOf('isoWeek');
    const endOfWeek = dayjs().endOf('isoWeek');
    const myIdSet = new Set(myEventIds);

    return events
      .filter(e => {
        const d = dayjs(e.date);
        return myIdSet.has(e.id) && !d.isBefore(startOfWeek) && !d.isAfter(endOfWeek);
      })
      .reduce<Partial<Record<ActivityType, ActivityEvent[]>>>((acc, e) => {
        if (!acc[e.type]) acc[e.type] = [];
        acc[e.type]!.push(e);
        return acc;
      }, {});
  }, [events, myEventIds]);
