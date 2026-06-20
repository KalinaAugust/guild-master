'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { useGetEventsQuery, useGetMyEventIdsQuery } from '@/entities/event';
import { useAppSelector } from '@/shared/lib/hooks';
import { Switch } from '@/shared/ui/Switch';
import type { Guild } from '@/entities/guild';
import type { ActivityEvent } from '@/shared/types';
import { useTodayEvents } from '../lib/useTodayEvents';
import { useWeekEventsByType } from '../lib/useWeekEventsByType';
import { TodayBlock } from './TodayBlock';
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
  const t = useTranslations('UpcomingEvents');

  // Hydration guard: false on the server and during hydration, true on the client.
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  const [onlyMine, setOnlyMine] = useState(true);

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

  const myEventIds = useMemo(() => myIdsData?.eventIds ?? [], [myIdsData]);

  const displayedToday = useTodayEvents(events, myEventIds, onlyMine);
  const eventsByType = useWeekEventsByType(events, myEventIds, onlyMine);
  const hasWeekEvents = Object.keys(eventsByType).length > 0;

  if (!isMounted) {
    return <div className={styles.strip} style={{ minHeight: '82px' }} />;
  }

  return (
    <div className={styles.strip}>
      <label className={styles.filterToggle}>
        <Switch
          checked={onlyMine}
          onCheckedChange={setOnlyMine}
          ariaLabel={t('onlyMine')}
        />
        <span className={styles.filterToggleLabel}>{t('onlyMine')}</span>
      </label>
      <div className={styles.content}>
        <TodayBlock events={displayedToday} />
        {hasWeekEvents && (
          <>
            <div className={styles.divider} />
            <WeekByTypeBlock eventsByType={eventsByType} />
          </>
        )}
      </div>
    </div>
  );
};
