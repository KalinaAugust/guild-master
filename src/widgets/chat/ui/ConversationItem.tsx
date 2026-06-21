import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { resolveDisplayName } from '@/entities/user';
import type { DmConversation } from '@/entities/direct-message';
import { Paperclip } from 'lucide-react';
import styles from './ConversationList.module.css';

interface ConversationItemProps {
  conversation: DmConversation;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
}) => {
  const t = useTranslations('DirectMessages');
  const locale = useLocale();
  const { peer, lastMessage, hasUnread } = conversation;

  const isOnline = peer.lastSeenAt && dayjs().diff(peer.lastSeenAt, 'minute') < 5;
  const name = resolveDisplayName({
    fullName: peer.fullName,
    alias: peer.alias,
    displayAsAlias: peer.displayAsAlias,
  });

  const timeStr = dayjs(lastMessage.createdAt).locale(locale).fromNow(true);

  return (
    <button
      type="button"
      className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
      onClick={onClick}
    >
      <div className={styles.avatarWrapper}>
        <UserAvatar avatarUrl={peer.avatarUrl} name={name} size="md" />
      </div>
      
      <div className={styles.itemContent}>
        <div className={styles.itemHeader}>
          <div className={styles.nameContainer}>
            <span className={styles.name} title={name ?? undefined}>{name}</span>
            {isOnline && <div className={styles.onlineDot} />}
          </div>
          <span className={styles.time}>{timeStr}</span>
        </div>
        <div className={styles.itemFooter}>
          <div className={styles.preview}>
            {lastMessage.senderIsMe && <span className={styles.youPrefix}>{t('you')}</span>}
            {!lastMessage.body && lastMessage.attachmentUrl ? (
              <span className={styles.attachmentPreview}>
                <Paperclip size={14} className={styles.attachmentIcon} /> {t('attachmentPreview')}
              </span>
            ) : (
              <span className={styles.bodyPreview}>{lastMessage.body}</span>
            )}
          </div>
          {hasUnread && <div className={styles.unreadDot} />}
        </div>
      </div>
    </button>
  );
};
