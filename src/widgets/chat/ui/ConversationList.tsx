'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users, Search, Paperclip, Shield } from 'lucide-react';
import { useGetConversationsQuery } from '@/entities/direct-message';
import type { Guild } from '@/entities/guild';
import { useGetGuildMessagesQuery } from '@/entities/guild-message';
import { resolveDisplayName } from '@/entities/user';
import { useAppSelector } from '@/shared/lib/hooks';
import { skipToken } from '@reduxjs/toolkit/query';
import { Panel } from '@/shared/ui/Panel';
import { ConversationItem } from './ConversationItem';
import styles from './ConversationList.module.css';

interface ConversationListProps {
  guilds: Guild[];
  userId?: string;
  initialGuildId?: string;
  activePeerId?: string;
  guildSelected: boolean;
  onSelectGuild: () => void;
  onSelectPeer: (publicId: string) => void;
  guildUnread?: boolean;
  isOfficer?: boolean;
  officerSelected?: boolean;
  onSelectOfficer?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  guilds,
  userId,
  initialGuildId,
  activePeerId,
  guildSelected,
  onSelectGuild,
  onSelectPeer,
  guildUnread,
  isOfficer,
  officerSelected,
  onSelectOfficer,
}) => {
  const t = useTranslations('DirectMessages');
  const { data: conversations = [], isLoading } = useGetConversationsQuery();
  const currentGuildId = useAppSelector((state) => state.guild.currentGuildId);

  // Redux `currentGuildId` is hydrated from persisted client state, so it isn't
  // available during SSR. Resolve from props on first render to keep server and
  // client markup identical, then switch to the store value after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeGuild = useMemo(() => {
    const activeId = (mounted && currentGuildId) || initialGuildId;
    return guilds.find((g) => g.id === activeId) ?? guilds[0];
  }, [guilds, initialGuildId, currentGuildId, mounted]);

  const guildName = activeGuild
    ? t('guildChatLabel', { name: activeGuild.name })
    : t('guildChat');

  const { data: guildData } = useGetGuildMessagesQuery(
    activeGuild ? { guildId: activeGuild.id, scope: 'all' } : skipToken
  );
  const lastGuildMessage = guildData?.messages.at(-1);
  const lastSenderName = lastGuildMessage
    ? resolveDisplayName(lastGuildMessage.profile)
    : null;

  const { data: officerData } = useGetGuildMessagesQuery(
    isOfficer && activeGuild ? { guildId: activeGuild.id, scope: 'officers' } : skipToken
  );
  const lastOfficerMessage = officerData?.messages.at(-1);
  const lastOfficerSender = lastOfficerMessage
    ? resolveDisplayName(lastOfficerMessage.profile)
    : null;
  const officerLabel = activeGuild
    ? t('officerChatLabel', { name: activeGuild.name })
    : t('officerChat');

  const [search, setSearch] = useState('');

  const sortedConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...conversations]
      .filter((c) => {
        if (!query) return true;
        const name = resolveDisplayName({
          fullName: c.peer.fullName,
          alias: c.peer.alias,
          displayAsAlias: c.peer.displayAsAlias,
        });
        return name?.toLowerCase().includes(query) ?? false;
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessage.createdAt).getTime() -
          new Date(a.lastMessage.createdAt).getTime(),
      );
  }, [conversations, search]);

  return (
    <Panel className={styles.listContainer} disablePadding>
      <div className={styles.searchContainer}>
        <Search className={styles.searchIcon} size={18} />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <button
        type="button"
        className={`${styles.item} ${guildSelected ? styles.itemActive : ''}`}
        onClick={onSelectGuild}
      >
        <div className={styles.avatarWrapper}>
          <div className={styles.guildIcon}>
            {activeGuild?.avatarUrl ? (
              <img
                src={activeGuild.avatarUrl}
                alt={activeGuild.name}
                className={styles.guildAvatarImg}
              />
            ) : (
              <Users size={20} />
            )}
          </div>
        </div>
        <div className={styles.itemContent}>
          <div className={styles.itemHeader}>
            <span className={styles.name}>{guildName}</span>
          </div>
          {lastGuildMessage && (
            <div className={styles.itemFooter}>
              <div className={styles.preview}>
                <span className={styles.senderName}>
                  {lastGuildMessage.userId === userId
                    ? t('you')
                    : t('senderPrefix', { name: lastSenderName ?? '' })}
                </span>
                {!lastGuildMessage.body && lastGuildMessage.attachmentUrl ? (
                  <span className={styles.attachmentPreview}>
                    <Paperclip size={14} className={styles.attachmentIcon} /> {t('attachmentPreview')}
                  </span>
                ) : (
                  <span className={styles.bodyPreview}>{lastGuildMessage.body}</span>
                )}
              </div>
            </div>
          )}
        </div>
        {guildUnread && <div className={styles.unreadDot} />}
      </button>

      {isOfficer && (
        <button
          type="button"
          className={`${styles.item} ${officerSelected ? styles.itemActive : ''}`}
          onClick={onSelectOfficer}
        >
          <div className={styles.avatarWrapper}>
            <div className={styles.guildIcon}>
              <Shield size={20} />
            </div>
          </div>
          <div className={styles.itemContent}>
            <div className={styles.itemHeader}>
              <span className={styles.name}>{officerLabel}</span>
            </div>
            {lastOfficerMessage && (
              <div className={styles.itemFooter}>
                <div className={styles.preview}>
                  <span className={styles.senderName}>
                    {lastOfficerMessage.userId === userId
                      ? t('you')
                      : t('senderPrefix', { name: lastOfficerSender ?? '' })}
                  </span>
                  {!lastOfficerMessage.body && lastOfficerMessage.attachmentUrl ? (
                    <span className={styles.attachmentPreview}>
                      <Paperclip size={14} className={styles.attachmentIcon} /> {t('attachmentPreview')}
                    </span>
                  ) : (
                    <span className={styles.bodyPreview}>{lastOfficerMessage.body}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </button>
      )}

      <div className={styles.divider} />

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
