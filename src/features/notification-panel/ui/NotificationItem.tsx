'use client';

import { useTranslations } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { NOTIFICATION_TYPE_CONFIG, type Notification, type NotificationTranslationFn } from '@/entities/notification';
import styles from './NotificationItem.module.css';

interface Props {
  notification: Notification;
}

export const NotificationItem = ({ notification }: Props) => {
  const t = useTranslations('Notifications');
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];

  if (!config) return null;

  const { Icon, getLabel } = config;
  // next-intl's typed t function is not directly assignable to NotificationTranslationFn
  // due to overloaded signatures; the cast is intentional.
  const label = getLabel(t as unknown as NotificationTranslationFn, notification);

  return (
    <div className={`${styles.item} ${notification.is_read ? styles.itemRead : ''}`}>
      <Icon size={16} className={styles.icon} />
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        {notification.event_title && (
          <span className={styles.sub}>
            {notification.event_title}
            {notification.event_date && ` · ${dayjs(notification.event_date).format('D MMM')}`}
          </span>
        )}
      </div>
      {!notification.is_read && <span className={styles.dot} />}
    </div>
  );
};
