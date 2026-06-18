'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { EventParticipant } from '@/shared/types';
import { resolveDisplayName } from '@/entities/user';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { Button } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';
import { NameWithIcon } from '@/shared/ui/NameWithIcon';
import styles from './ParticipantItem.module.css';

interface ParticipantItemProps {
  participant: EventParticipant;
  isCurrentUser: boolean;
  note?: string;
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
  note,
  onConfirm,
  onDecline,
  onLeave,
  isConfirming = false,
  isDeclining = false,
  isLeaving = false,
}) => {
  const t = useTranslations('EventDetail');

  const participantName = resolveDisplayName({
    fullName: participant.profile.fullName,
    alias: participant.profile.alias,
    displayAsAlias: participant.profile.displayAsAlias,
  });

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
      data-suppress-note-tooltip
    >
      <ProfileLink
        publicId={participant.profile.publicId}
        aria-label={participantName ?? undefined}
        className={styles.avatarLink}
      >
        <UserAvatar
          avatarUrl={participant.profile.avatarUrl}
          name={participantName}
          size="md"
        />
      </ProfileLink>
      <div className={styles.info}>
        <div className={styles.header}>
          <ProfileLink publicId={participant.profile.publicId} className={styles.name}>
            <NameWithIcon name={participantName} icon={participant.profile.icon} fallback="—" iconSize={14} />
          </ProfileLink>
          <span className={`${styles.statusLabel} ${styles[`statusLabel_${participant.status}`]}`}>
            {t(`status.${participant.status}` as Parameters<typeof t>[0])}
          </span>
        </div>
        {note && <span className={styles.note}>{note}</span>}
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
