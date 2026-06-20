'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useGetParticipantsQuery, typeIcons } from '@/entities/event';
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
        <span className={styles.participantsText}>
          {t('confirmedCount', { count: confirmed.length })}
        </span>
      </span>
    </Tooltip>
  );
};

interface Props {
  events: ActivityEvent[];
}

export const TodayBlock: React.FC<Props> = ({ events }) => {
  const t = useTranslations('UpcomingEvents');
  return (
    <div className={styles.todayBlock}>
      <div className={styles.blockLabel}>{t('todayEvents')}</div>
      {events.length > 0 ? (
        <ul className={styles.todayList}>
          {events.map(event => (
            <li key={event.id} className={styles.todayItem}>
              <span className={`${styles.typeIcon} ${styles[`iconType_${event.type}`]}`} aria-hidden="true">
                {typeIcons[event.type]}
              </span>
              <div className={styles.todayItemContent}>
                <div className={styles.todayItemHeader}>
                  <span className={styles.eventMeta}>
                    <Clock size={12} />
                    {event.time}
                  </span>
                  <Link
                    href={`/events/${event.publicId ?? event.id}`}
                    className={styles.eventLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {event.title}
                  </Link>
                </div>
                {event.description && (
                  <span className={styles.eventDescription}>{event.description}</span>
                )}
              </div>
              <ParticipantsBadge eventId={event.id} />
            </li>
          ))}
        </ul>
      ) : (
        <span className={styles.emptyText}>{t('noToday')}</span>
      )}
    </div>
  );
};
