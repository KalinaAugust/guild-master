'use client';

import { useTranslations } from 'next-intl';
import type { Notification } from '@/entities/notification';
import { NotificationItem } from './NotificationItem';
import styles from './NotificationPanel.module.css';

interface Props {
  notifications: Notification[];
  onMarkAllRead?: () => void;
  onClose?: () => void;
}

export const NotificationPanel = ({ notifications, onMarkAllRead, onClose }: Props) => {
  const t = useTranslations('Notifications');
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>{t('title')}</span>
        {hasUnread && onMarkAllRead && (
          <button className={styles.markAllRead} onClick={onMarkAllRead}>
            {t('markAllRead')}
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className={styles.empty}>{t('empty')}</div>
      ) : (
        <ul className={styles.list}>
          {notifications.map((n) => (
            <li key={n.id}>
              <NotificationItem notification={n} onClose={onClose} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
