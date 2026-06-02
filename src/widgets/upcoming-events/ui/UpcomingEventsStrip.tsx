'use client';

import React, { useMemo } from 'react';
import { useGetEventsQuery, useGetMyEventIdsQuery } from '@/entities/event';
import { useAppSelector } from '@/shared/lib/hooks';
import type { Guild } from '@/entities/guild';
import { useNextEvent } from '../lib/useNextEvent';
import { useWeekEventsByType } from '../lib/useWeekEventsByType';
import { NextEventBlock } from './NextEventBlock';
import { WeekByTypeBlock } from './WeekByTypeBlock';
import styles from './UpcomingEventsStrip.module.css';

interface Props {
  guilds: Guild[];
  userId?: string;
}

export const UpcomingEventsStrip: React.FC<Props> = ({ guilds, userId }) => {
  const currentGuildId = useAppSelector(state => state.guild.currentGuildId);
  const activeGuildId = useMemo(
    () => currentGuildId || guilds[0]?.id,
    [currentGuildId, guilds]
  );

  const { data: events = [] } = useGetEventsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });
  const { data: myIdsData } = useGetMyEventIdsQuery(activeGuildId ?? '', {
    skip: !activeGuildId || !userId,
  });

  const nextEvent = useNextEvent(events);
  const eventsByType = useWeekEventsByType(events, myIdsData?.eventIds ?? []);
  const hasWeekEvents = Object.keys(eventsByType).length > 0;

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
