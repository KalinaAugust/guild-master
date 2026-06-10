import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/Button';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import type { EventJoinRequest } from '../api/detailApi';
import styles from './EventJoinRequestItem.module.css';

interface EventJoinRequestItemProps {
  request: EventJoinRequest;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
  disabled?: boolean;
}

export const EventJoinRequestItem: React.FC<EventJoinRequestItemProps> = ({
  request,
  onAccept,
  onDecline,
  isAccepting = false,
  isDeclining = false,
  disabled = false,
}) => {
  const t = useTranslations('EventDetail');

  return (
    <div className={styles.row}>
      <ProfileLink publicId={request.publicId} aria-label={request.userName ?? undefined}>
        <UserAvatar avatarUrl={request.avatarUrl} name={request.userName} size="sm" />
      </ProfileLink>
      <ProfileLink publicId={request.publicId} className={styles.name}>
        {request.userName ?? '—'}
      </ProfileLink>
      <div className={styles.actions}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onAccept}
          isLoading={isAccepting}
          disabled={disabled && !isAccepting}
        >
          {t('acceptRequest')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onDecline}
          isLoading={isDeclining}
          disabled={disabled && !isDeclining}
        >
          {t('declineRequest')}
        </Button>
      </div>
    </div>
  );
};
