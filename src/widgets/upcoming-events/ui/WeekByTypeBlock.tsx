'use client';

import React from 'react';
import { Sword, Layers, Music, Users, Gamepad2, Activity, CalendarDays } from 'lucide-react';
import { Tooltip } from '@/shared/ui/Tooltip';
import type { ActivityEvent, ActivityType } from '@/shared/types';
import { EventTypeTooltip } from './EventTypeTooltip';
import styles from './UpcomingEventsStrip.module.css';

const TYPE_CONFIG: Record<ActivityType, { label: string; icon: React.ReactNode }> = {
  raid:    { label: 'Рейды',      icon: <Sword size={13} /> },
  dungeon: { label: 'Подземелья', icon: <Layers size={13} /> },
  party:   { label: 'Вечеринки',  icon: <Music size={13} /> },
  meeting: { label: 'Встречи',    icon: <Users size={13} /> },
  game:    { label: 'Игры',       icon: <Gamepad2 size={13} /> },
  sport:   { label: 'Спорт',      icon: <Activity size={13} /> },
  other:   { label: 'Прочее',     icon: <CalendarDays size={13} /> },
};

interface Props {
  eventsByType: Partial<Record<ActivityType, ActivityEvent[]>>;
}

export const WeekByTypeBlock: React.FC<Props> = ({ eventsByType }) => {
  const entries = Object.entries(eventsByType) as [ActivityType, ActivityEvent[]][];
  if (entries.length === 0) return null;

  return (
    <div className={styles.weekBlock}>
      <div className={styles.blockLabel}>На этой неделе</div>
      <div className={styles.typeChips}>
        {entries.map(([type, events]) => (
          <Tooltip
            key={type}
            content={<EventTypeTooltip events={events} typeName={TYPE_CONFIG[type].label} />}
            side="top"
            delayDuration={200}
          >
            <div className={`${styles.typeChip} ${styles[`chip_${type}`]}`}>
              {TYPE_CONFIG[type].icon}
              <span>{events.length}</span>
            </div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
};
