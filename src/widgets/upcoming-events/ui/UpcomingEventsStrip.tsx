'use client';

import React, { useMemo, useSyncExternalStore } from 'react';
import { useGetEventsQuery, useGetMyEventIdsQuery } from '@/entities/event';
import { useAppSelector } from '@/shared/lib/hooks';
import type { Guild } from '@/entities/guild';
import type { ActivityEvent } from '@/shared/types';
import { useNextEvent } from '../lib/useNextEvent';
import { useWeekEventsByType } from '../lib/useWeekEventsByType';
import { NextEventBlock } from './NextEventBlock';
import { WeekByTypeBlock } from './WeekByTypeBlock';
import styles from './UpcomingEventsStrip.module.css';

interface Props {
  guilds: Guild[];
  userId?: string;
  initialEvents?: ActivityEvent[];
  initialGuildId?: string;
}

// Stable references for the hydration guard, so useSyncExternalStore never
// re-subscribes between renders.
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export const UpcomingEventsStrip: React.FC<Props> = ({ guilds, userId, initialEvents = [], initialGuildId }) => {
  // Hydration guard: false on the server and during hydration, true on the client.
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  const currentGuildId = useAppSelector(state => state.guild.currentGuildId);
  const activeGuildId = useMemo(
    () => currentGuildId || guilds[0]?.id,
    [currentGuildId, guilds]
  );

  const { data: fetchedEvents } = useGetEventsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });
  const { data: myIdsData } = useGetMyEventIdsQuery(activeGuildId ?? '', {
    skip: !activeGuildId || !userId,
  });

  const events = fetchedEvents ?? (activeGuildId === initialGuildId ? initialEvents : []);

  const nextEvent = useNextEvent(events);
  const eventsByType = useWeekEventsByType(events, myIdsData?.eventIds ?? []);
  const hasWeekEvents = Object.keys(eventsByType).length > 0;

  if (!isMounted) {
    return <div className={styles.strip} style={{ minHeight: '82px' }} />;
  }

  return (
    <div className={styles.strip}>
      <NextEventBlock event={nextEvent} />
      {hasWeekEvents && (
        <>
          <div className={styles.divider} />
          <WeekByTypeBlock eventsByType={eventsByType} />
        </>
      )}
    </div>
  );
};
