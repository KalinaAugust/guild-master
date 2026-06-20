'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Users, Search } from 'lucide-react';
import { useGetConversationsQuery } from '@/entities/direct-message';
import { Panel } from '@/shared/ui/Panel';
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
    <Panel className={styles.listContainer}>
      <div className={styles.searchContainer}>
        <Search className={styles.searchIcon} size={18} />
        <input 
          type="text" 
          placeholder={t('searchPlaceholder')} 
          className={styles.searchInput} 
        />
      </div>

      <button
        type="button"
        className={`${styles.item} ${guildSelected ? styles.itemActive : ''}`}
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
    </Panel>
  );
};
