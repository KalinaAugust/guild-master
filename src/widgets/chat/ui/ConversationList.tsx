'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { useGetConversationsQuery } from '@/entities/direct-message';
import { ConversationItem } from './ConversationItem';
import styles from './ConversationList.module.css';

interface ConversationListProps {
  activePeerId?: string;
  guildSelected: boolean;
  onSelectGuild: () => void;
  onSelectPeer: (publicId: string) => void;
  guildUnread?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  activePeerId,
  guildSelected,
  onSelectGuild,
  onSelectPeer,
  guildUnread,
}) => {
  const t = useTranslations('DirectMessages');
  const { data: conversations = [], isLoading } = useGetConversationsQuery();

  const sortedConversations = [...conversations].sort((a, b) => 
    new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
  );

  return (
    <div className={styles.listContainer}>
      <button
        type="button"
        className={`${styles.item} ${styles.guildItem} ${guildSelected ? styles.itemActive : ''}`}
        onClick={onSelectGuild}
      >
        <div className={styles.avatarWrapper}>
          <div className={styles.guildIcon}>
            <Users size={20} />
          </div>
        </div>
        <div className={styles.itemContent}>
          <div className={styles.itemHeader}>
            <span className={styles.name}>{t('guildChat')}</span>
          </div>
        </div>
        {guildUnread && <div className={styles.unreadDot} />}
      </button>

      <div className={styles.conversationsScroll}>
        {isLoading ? (
          <div className={styles.empty}>{t('loadingOlder')}</div>
        ) : sortedConversations.length === 0 ? (
          <div className={styles.empty}>{t('conversationsEmpty')}</div>
        ) : (
          sortedConversations.map((conv) => (
            <ConversationItem
              key={conv.peer.publicId}
              conversation={conv}
              isActive={!guildSelected && activePeerId === conv.peer.publicId}
              onClick={() => {
                if (conv.peer.publicId) onSelectPeer(conv.peer.publicId);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};
