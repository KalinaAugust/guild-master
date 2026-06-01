'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import dayjs from '@/shared/lib/dayjs';
import { useGetParticipantsQuery } from '@/entities/event';
import { Tooltip } from '@/shared/ui/Tooltip';
import type { ActivityEvent } from '@/shared/types';
import { ParticipantsTooltip } from './ParticipantsTooltip';
import styles from './UpcomingEventsStrip.module.css';

const relativeDay = (date: string): string => {
  const diff = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (diff === 0) return 'Сегодня';
  if (diff === 1) return 'Завтра';
  return dayjs(date).format('D MMM');
};

const ParticipantsBadge: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { data } = useGetParticipantsQuery(eventId);
  const confirmed = data?.participants.filter(p => p.status === 'confirmed') ?? [];
  return (
    <Tooltip
      content={<ParticipantsTooltip participants={data?.participants ?? []} />}
      side="top"
      delayDuration={200}
    >
      <span className={styles.participantsBadge}>
        <Users size={12} />
        {confirmed.length} участников
      </span>
    </Tooltip>
  );
};

interface Props {
  event: ActivityEvent | null;
}

export const NextEventBlock: React.FC<Props> = ({ event }) => (
  <div className={styles.nextEventBlock}>
    <div className={styles.blockLabel}>Следующее событие</div>
    {event ? (
      <div className={styles.eventRow}>
        <Link href={`/events/${event.id}`} className={styles.eventLink} target="_blank" rel="noopener noreferrer">
          {event.title}
        </Link>
        <span className={styles.eventMeta}>
          <Clock size={12} />
          {relativeDay(event.date)} · {event.time}
        </span>
        <span className={styles.dot}>·</span>
        <ParticipantsBadge eventId={event.id} />
      </div>
    ) : (
      <span className={styles.emptyText}>Событий не запланировано</span>
    )}
  </div>
);
