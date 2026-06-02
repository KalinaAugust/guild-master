'use client';

import React from 'react';
import { Sword, Layers, Music, Users, Gamepad2, Activity, CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Tooltip } from '@/shared/ui/Tooltip';
import type { ActivityEvent, ActivityType } from '@/shared/types';
import { EventTypeTooltip } from './EventTypeTooltip';
import styles from './UpcomingEventsStrip.module.css';

const TYPE_ICON: Record<ActivityType, React.ReactNode> = {
  raid:    <Sword size={13} />,
  dungeon: <Layers size={13} />,
  party:   <Music size={13} />,
  meeting: <Users size={13} />,
  game:    <Gamepad2 size={13} />,
  sport:   <Activity size={13} />,
  other:   <CalendarDays size={13} />,
};

interface Props {
  eventsByType: Partial<Record<ActivityType, ActivityEvent[]>>;
}

export const WeekByTypeBlock: React.FC<Props> = ({ eventsByType }) => {
  const t = useTranslations('UpcomingEvents');
  const commonT = useTranslations('Common');
  const entries = Object.entries(eventsByType) as [ActivityType, ActivityEvent[]][];
  if (entries.length === 0) return null;

  return (
    <div className={styles.weekBlock}>
      <div className={styles.blockLabel}>{t('thisWeek')}</div>
      <div className={styles.typeChips}>
        {entries.map(([type, events]) => (
          <Tooltip
            key={type}
            content={<EventTypeTooltip events={events} typeName={commonT(`eventTypesPlural.${type}` as Parameters<typeof commonT>[0])} />}
            side="top"
            delayDuration={200}
          >
            <div className={`${styles.typeChip} ${styles[`chip_${type}`]}`}>
              {TYPE_ICON[type]}
              <span>{events.length}</span>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
