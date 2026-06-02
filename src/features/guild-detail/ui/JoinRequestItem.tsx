import React from 'react';
import { useTranslations } from 'next-intl';
import { JoinRequest } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import styles from './JoinRequestItem.module.css';

interface JoinRequestItemProps {
  request: JoinRequest;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
  disabled?: boolean;
}

export const JoinRequestItem: React.FC<JoinRequestItemProps> = ({
  request,
  onAccept,
  onDecline,
  isAccepting = false,
  isDeclining = false,
  disabled = false,
}) => {
  const t = useTranslations('GuildDetail');

  return (
    <div className={styles.row}>
      <UserAvatar avatarUrl={request.avatarUrl} name={request.userName} size="sm" />
      <span className={styles.name}>{request.userName ?? '—'}</span>
      <div className={styles.actions}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onAccept}
          isLoading={isAccepting}
          disabled={disabled && !isAccepting}
        >
          {t('accept')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onDecline}
          isLoading={isDeclining}
          disabled={disabled && !isDeclining}
        >
          {t('decline')}
        </Button>
      </div>
    </div>
  );
};
