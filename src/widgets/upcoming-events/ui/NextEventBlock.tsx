'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getRelativeDay } from '@/shared/lib/relativeDay';
import { useGetParticipantsQuery } from '@/entities/event';
import { Tooltip } from '@/shared/ui/Tooltip';
import type { ActivityEvent } from '@/shared/types';
import { ParticipantsTooltip } from './ParticipantsTooltip';
import styles from './UpcomingEventsStrip.module.css';

const ParticipantsBadge: React.FC<{ eventId: string }> = ({ eventId }) => {
  const t = useTranslations('UpcomingEvents');
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
        {t('confirmedCount', { count: confirmed.length })}
      </span>
    </Tooltip>
  );
};

interface Props {
  event: ActivityEvent | null;
}

export const NextEventBlock: React.FC<Props> = ({ event }) => {
  const t = useTranslations('UpcomingEvents');
  return (
    <div className={styles.nextEventBlock}>
      <div className={styles.blockLabel}>{t('nextEvent')}</div>
      {event ? (
        <div className={styles.eventRow}>
          <Link href={`/events/${event.id}`} className={styles.eventLink} target="_blank" rel="noopener noreferrer">
            {event.title}
          </Link>
          <span className={styles.eventMeta}>
            <Clock size={12} />
            {getRelativeDay(event.date, t('today'), t('tomorrow'))} · {event.time}
          </span>
          <span className={styles.dot}>·</span>
          <ParticipantsBadge eventId={event.id} />
        </div>
      ) : (
        <span className={styles.emptyText}>{t('noUpcoming')}</span>
      )}
    </div>
  );
};
