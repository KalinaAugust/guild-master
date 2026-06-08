'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { Panel } from '@/shared/ui/Panel';
import { MessageBubble } from '@/shared/ui/MessageBubble';
import { MessageComposer } from '@/shared/ui/MessageComposer';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import type { Guild } from '@/entities/guild';
import {
  useGetGuildMessagesQuery,
  useGetGuildChatReadStateQuery,
  useAddGuildMessageMutation,
  useUpdateGuildMessageMutation,
  useDeleteGuildMessageMutation,
  useMarkGuildChatReadMutation,
} from '@/entities/guild-message';
import styles from './GuildChat.module.css';

interface GuildChatProps {
  guilds: Guild[];
  userId?: string;
  initialGuildId?: string;
}

export const GuildChat: React.FC<GuildChatProps> = ({ guilds, userId, initialGuildId }) => {
  const t = useTranslations('GuildChat');
  const locale = useLocale();
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds, initialGuildId, userId);

  const { data: messages = [], isLoading } = useGetGuildMessagesQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
    pollingInterval: 60_000,
    refetchOnFocus: true,
    skipPollingIfUnfocused: true,
  });
  const { data: readState } = useGetGuildChatReadStateQuery(activeGuildId ?? '', { skip: !activeGuildId });
  const [addMessage, { isLoading: isAdding }] = useAddGuildMessageMutation();
  const [updateMessage, updateState] = useUpdateGuildMessageMutation();
  const [deleteMessage, deleteState] = useDeleteGuildMessageMutation();
  const [markRead] = useMarkGuildChatReadMutation();
  const listRef = useRef<HTMLDivElement>(null);

  const hasUnread =
    !!readState &&
    messages.some(
      (m) =>
        m.userId !== userId &&
        (!readState.lastReadAt || m.createdAt > readState.lastReadAt),
    );

  useEffect(() => {
    if (activeGuildId && hasUnread) markRead(activeGuildId);
  }, [activeGuildId, hasUnread, markRead]);

  const pendingScrollRef = useRef(true);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    pendingScrollRef.current = true;
  }, [activeGuildId]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (pendingScrollRef.current || isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      pendingScrollRef.current = false;
    }
  }, [messages.length]);

  const labels = {
    edited: t('edited'),
    edit: t('edit'),
    delete: t('delete'),
    save: t('save'),
    cancel: t('cancel'),
    confirmDelete: t('confirmDelete'),
  };

  const handleAdd = async (body: string) => {
    if (!activeGuildId) return;
    try {
      await addMessage({ guildId: activeGuildId, body }).unwrap();
      pendingScrollRef.current = true;
    } catch {
      toast.error(t('sendError'));
    }
  };

  const handleUpdate = async (messageId: string, body: string) => {
    if (!activeGuildId) return;
    try {
      await updateMessage({ guildId: activeGuildId, messageId, body }).unwrap();
    } catch (e) {
      toast.error(t('updateError'));
      throw e;
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!activeGuildId) return;
    try {
      await deleteMessage({ guildId: activeGuildId, messageId }).unwrap();
    } catch {
      toast.error(t('deleteError'));
    }
  };

  return (
    <Panel>
      <div className={styles.header}>
        <div className={styles.guildSelect}>
          <GuildSelect value={activeGuildId} onValueChange={handleGuildChange} options={guildOptions} />
        </div>
      </div>

      <div className={styles.chat}>
        <div className={styles.list} ref={listRef} onScroll={handleScroll}>
          {!isLoading && messages.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              authorName={m.profile.fullName}
              avatarUrl={m.profile.avatarUrl}
              body={m.body}
              createdAt={m.createdAt}
              updatedAt={m.updatedAt}
              isOwn={m.userId === userId}
              locale={locale}
              labels={labels}
              maxLength={2000}
              onSave={(body) => handleUpdate(m.id, body)}
              onDelete={() => handleDelete(m.id)}
              isSaving={updateState.isLoading && updateState.originalArgs?.messageId === m.id}
              isDeleting={deleteState.isLoading && deleteState.originalArgs?.messageId === m.id}
            />
          ))}
        </div>
        <MessageComposer
          canWrite={!!userId}
          onSubmit={handleAdd}
          isSubmitting={isAdding}
          placeholder={t('placeholder')}
          sendLabel={t('send')}
          lockedPrompt={t('lockedPrompt')}
          maxLength={2000}
        />
      </div>
    </Panel>
  );
};
