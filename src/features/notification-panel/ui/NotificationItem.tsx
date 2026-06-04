'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import dayjs from '@/shared/lib/dayjs';
import { NOTIFICATION_TYPE_CONFIG, useMarkAsReadMutation, type Notification, type NotificationTranslationFn } from '@/entities/notification';
import styles from './NotificationItem.module.css';

interface Props {
  notification: Notification;
  onClose?: () => void;
}

export const NotificationItem = ({ notification, onClose }: Props) => {
  const t = useTranslations('Notifications');
  const locale = useLocale();
  const [markAsRead] = useMarkAsReadMutation();
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];

  if (!config) return null;

  const { Icon } = config;
  const timeAgo = dayjs(notification.created_at).locale(locale).fromNow();

  const handleMouseEnter = () => {
    if (!notification.is_read) markAsRead(notification.id);
  };

  const href =
    notification.entity_id && notification.entity_type === 'event'
      ? `/events/${notification.entity_id}`
      : notification.entity_id && notification.entity_type === 'guild'
        ? `/guilds/${notification.entity_id}`
        : null;

  const label =
    config.linksToGuild && config.messageKey
      ? t.rich(config.messageKey, {
          guildName: notification.guild_name ?? '',
          guild: (chunks) =>
            href ? (
              <Link
                href={href}
                className={styles.guildLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
              >
                {chunks}
              </Link>
            ) : (
              chunks
            ),
        })
      : // next-intl's typed t function is not directly assignable to NotificationTranslationFn
        // due to overloaded signatures; the cast is intentional.
        config.getLabel?.(t as unknown as NotificationTranslationFn, notification);

  return (
    <div
      className={`${styles.item} ${notification.is_read ? styles.itemRead : ''}`}
      onMouseEnter={handleMouseEnter}
    >
      <Icon size={16} className={styles.icon} />
      <div className={styles.content}>
        <span className={styles.time}>{timeAgo}</span>
        <span className={styles.label}>{label}</span>
        {notification.event_title && (
          <span className={styles.sub}>
            {href ? (
              <Link
                href={href}
                className={styles.titleLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
              >
                {notification.event_title}
              </Link>
            ) : (
              notification.event_title
            )}
            {notification.event_date && ` · ${dayjs(notification.event_date).format('D MMM')}`}
          </span>
        )}
      </div>
      <div className={styles.actions}>
        {href && (
          <Link
            href={href}
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
          >
            <ArrowUpRight size={14} />
          </Link>
        )}
        {!notification.is_read && <span className={styles.dot} />}
      </div>
    </div>
  );
};
