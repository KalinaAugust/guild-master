'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { getRelativeDay } from '@/shared/lib/relativeDay';
import type { ActivityEvent } from '@/shared/types';
import styles from './UpcomingEventsStrip.module.css';

interface Props {
  events: ActivityEvent[];
  typeName: string;
}

export const EventTypeTooltip: React.FC<Props> = ({ events, typeName }) => {
  const t = useTranslations('UpcomingEvents');
  return (
    <div className={styles.typeTooltip}>
      <div className={styles.tooltipLabel}>{typeName}</div>
      {events.map(e => (
        <div key={e.id} className={styles.typeTooltipRow}>
          <span className={styles.typeTooltipTitle}>{e.title}</span>
          <span className={styles.typeTooltipTime}>{getRelativeDay(e.date, t('today'), t('tomorrow'))} · {e.time}</span>
        </div>
      ))}
    </div>
  );
};
