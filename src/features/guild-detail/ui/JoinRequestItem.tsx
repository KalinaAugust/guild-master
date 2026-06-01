import React from 'react';
import { useTranslations } from 'next-intl';
import { JoinRequest } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import styles from './JoinRequestItem.module.css';

interface JoinRequestItemProps {
  request: JoinRequest;
  onAccept: () => void;
  onDecline: () => void;
}

export const JoinRequestItem: React.FC<JoinRequestItemProps> = ({ request, onAccept, onDecline }) => {
  const t = useTranslations('GuildDetail');

  return (
    <div className={styles.row}>
      <div className={styles.avatar}>
        {request.avatarUrl ? (
          <img src={request.avatarUrl} alt="" className={styles.avatarImg} />
        ) : (
          <span className={styles.avatarFallback}>
            {(request.userName ?? '?')[0].toUpperCase()}
          </span>
        )}
      </div>
      <span className={styles.name}>{request.userName ?? '—'}</span>
      <div className={styles.actions}>
        <Button type="button" variant="primary" size="sm" onClick={onAccept}>
          {t('accept')}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDecline}>
          {t('decline')}
        </Button>
      </div>
    </div>
  );
};
