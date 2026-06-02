'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { EventParticipant } from '@/shared/types';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import styles from './ParticipantItem.module.css';

interface ParticipantItemProps {
  participant: EventParticipant;
  isCurrentUser: boolean;
  onConfirm?: () => void;
  onDecline?: () => void;
}

export const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  isCurrentUser,
  onConfirm,
  onDecline,
}) => {
  const t = useTranslations('EventDetail');

  const showActions = isCurrentUser && participant.status === 'pending';

  return (
    <div
      className={`${styles.item} ${isCurrentUser ? styles.currentUser : ''} ${styles[`status_${participant.status}`]}`}
    >
      <UserAvatar
        avatarUrl={participant.profile.avatarUrl}
        name={participant.profile.fullName}
        size="md"
      />
      <div className={styles.info}>
        <span className={styles.name}>{participant.profile.fullName || '—'}</span>
        <span className={`${styles.statusLabel} ${styles[`statusLabel_${participant.status}`]}`}>
          {t(`status.${participant.status}` as Parameters<typeof t>[0])}
        </span>
      </div>
      {showActions && (
        <div className={styles.actions}>
          <button className={styles.confirmBtn} onClick={onConfirm}>
            {t('confirmBtn')}
          </button>
          <button className={styles.declineBtn} onClick={onDecline}>
            {t('declineBtn')}
          </button>
        </div>
      )}
    </div>
  );
};
