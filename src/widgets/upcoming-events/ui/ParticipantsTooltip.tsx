'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { EventParticipant } from '@/shared/types';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import styles from './UpcomingEventsStrip.module.css';

interface Props {
  participants: EventParticipant[];
}

export const ParticipantsTooltip: React.FC<Props> = ({ participants }) => {
  const t = useTranslations('UpcomingEvents');
  const confirmed = participants.filter(p => p.status === 'confirmed');
  if (confirmed.length === 0) {
    return <span className={styles.tooltipEmpty}>{t('noConfirmations')}</span>;
  }
  return (
    <div className={styles.participantsList}>
      <div className={styles.tooltipLabel}>{t('confirmedLabel')}</div>
      {confirmed.map(p => (
        <div key={p.id} className={styles.participantRow}>
          <UserAvatar avatarUrl={p.profile.avatarUrl} name={p.profile.fullName} size="sm" />
          <span className={styles.participantName}>{p.profile.fullName ?? 'Unknown'}</span>
        </div>
      ))}
    </div>
  );
};
