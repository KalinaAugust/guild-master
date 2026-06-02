'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import type { ActivityEvent } from '@/shared/types';
import styles from './UpcomingEventsStrip.module.css';

interface Props {
  events: ActivityEvent[];
  typeName: string;
}

const relativeDay = (date: string, today: string, tomorrow: string): string => {
  const diff = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (diff === 0) return today;
  if (diff === 1) return tomorrow;
  return dayjs(date).format('D MMM');
};

export const EventTypeTooltip: React.FC<Props> = ({ events, typeName }) => {
  const t = useTranslations('UpcomingEvents');
  return (
    <div className={styles.typeTooltip}>
      <div className={styles.tooltipLabel}>{typeName}</div>
      {events.map(e => (
        <div key={e.id} className={styles.typeTooltipRow}>
          <span className={styles.typeTooltipTitle}>{e.title}</span>
          <span className={styles.typeTooltipTime}>{relativeDay(e.date, t('today'), t('tomorrow'))} · {e.time}</span>
        </div>
      ))}
    </div>
  );
};
