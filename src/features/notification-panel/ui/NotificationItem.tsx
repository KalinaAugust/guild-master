'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import dayjs from '@/shared/lib/dayjs';
import { NOTIFICATION_TYPE_CONFIG, useMarkAsReadMutation, type Notification, type NotificationTranslationFn } from '@/entities/notification';
import { useAppDispatch } from '@/shared/lib/hooks';
import { setCurrentGuild } from '@/entities/guild';
import { updateLastActiveGuild } from '@/entities/user';
import styles from './NotificationItem.module.css';

interface Props {
  notification: Notification;
  userId?: string;
  onClose?: () => void;
}

export const NotificationItem = ({ notification, userId, onClose }: Props) => {
  const t = useTranslations('Notifications');
  const locale = useLocale();
  const [markAsRead] = useMarkAsReadMutation();
  const dispatch = useAppDispatch();
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
        : config.feedHref ?? null;

  // Feed notifications (CTA / announcement) open the guild-scoped feed in the
  // same tab and switch the active guild so the feed lands on the right guild.
  const handleFeedClick = () => {
    if (config.switchesGuild && notification.guild_id) {
      dispatch(setCurrentGuild(notification.guild_id));
      if (userId) {
        updateLastActiveGuild(userId, notification.guild_id).catch((err) => {
          console.error('Failed to update last active guild:', err);
        });
      }
    }
    onClose?.();
  };

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

  const subTitle = notification.event_title ?? notification.title;
  const isFeed = Boolean(config.switchesGuild);

  return (
    <div
      className={`${styles.item} ${notification.is_read ? styles.itemRead : ''}`}
      onMouseEnter={handleMouseEnter}
    >
      <Icon size={16} className={styles.icon} />
      <div className={styles.content}>
        <span className={styles.time}>{timeAgo}</span>
        <span className={styles.label}>{label}</span>
        {subTitle && (
          <span className={styles.sub}>
            {href ? (
              <Link
                href={href}
                className={styles.titleLink}
                {...(isFeed
                  ? { onClick: handleFeedClick }
                  : { target: '_blank', rel: 'noopener noreferrer', onClick: onClose })}
              >
                {subTitle}
              </Link>
            ) : (
              subTitle
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
            {...(isFeed
              ? { onClick: handleFeedClick }
              : { target: '_blank', rel: 'noopener noreferrer', onClick: onClose })}
          >
            <ArrowUpRight size={14} />
          </Link>
        )}
        {!notification.is_read && <span className={styles.dot} />}
      </div>
    </div>
  );
};
