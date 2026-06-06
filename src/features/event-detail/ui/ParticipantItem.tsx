'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { EventParticipant } from '@/shared/types';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';
import styles from './ParticipantItem.module.css';

interface ParticipantItemProps {
  participant: EventParticipant;
  isCurrentUser: boolean;
  onConfirm?: () => void;
  onDecline?: () => void;
  onLeave?: () => void;
  isConfirming?: boolean;
  isDeclining?: boolean;
  isLeaving?: boolean;
}

export const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  isCurrentUser,
  onConfirm,
  onDecline,
  onLeave,
  isConfirming = false,
  isDeclining = false,
  isLeaving = false,
}) => {
  const t = useTranslations('EventDetail');

  const showActions = isCurrentUser && participant.status === 'pending';
  const showLeave =
    isCurrentUser &&
    (participant.status === 'confirmed' || participant.status === 'declined');

  return (
    <div
      className={[
        styles.item,
        isCurrentUser && styles.currentUser,
        styles[`status_${participant.status}`],
      ]
        .filter(Boolean)
        .join(' ')}
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
          <Button
            type="button"
            variant="primary"
            size="xs"
            onClick={onConfirm}
            isLoading={isConfirming}
            disabled={isDeclining}
          >
            {t('confirmBtn')}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="xs"
            onClick={onDecline}
            isLoading={isDeclining}
            disabled={isConfirming}
          >
            {t('declineBtn')}
          </Button>
        </div>
      )}
      {showLeave && (
        <Tooltip content={t('leave')}>
          <button
            type="button"
            className={styles.leaveButton}
            onClick={onLeave}
            disabled={isLeaving}
            aria-label={t('leave')}
          >
            <LogOut size={16} />
          </button>
        </Tooltip>
      )}
    </div>
  );
};
