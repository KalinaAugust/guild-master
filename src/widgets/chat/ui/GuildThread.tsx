'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import type { Guild } from '@/entities/guild';
import { uploadChatAttachment, type GuildMessage } from '@/entities/guild-message';
import { createClient } from '@/shared/api/supabase/client';
import { useAppDispatch } from '@/shared/lib/hooks';
import {
  guildMessageApi,
  useGetGuildMessagesQuery,
  useLazyFetchOlderMessagesQuery,
  useLazyFetchNewMessagesQuery,
  useGetGuildChatReadStateQuery,
  useAddGuildMessageMutation,
  useUpdateGuildMessageMutation,
  useDeleteGuildMessageMutation,
  useMarkGuildChatReadMutation,
} from '@/entities/guild-message';
import { ChatThread, type ChatThreadMessage } from './ChatThread';
import styles from './GuildThread.module.css';

interface GuildThreadProps {
  guilds: Guild[];
  userId?: string;
  viewerProfile?: GuildMessage['profile'];
  initialGuildId?: string;
}

export const GuildThread: React.FC<GuildThreadProps> = ({ guilds, userId, viewerProfile, initialGuildId }) => {
  const t = useTranslations('GuildChat');
  const locale = useLocale();
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds, initialGuildId, userId);
  const dispatch = useAppDispatch();

  const { data, isLoading } = useGetGuildMessagesQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
    refetchOnFocus: true,
  });
  const messages = data?.messages ?? [];
  const hasMore = data?.hasMore ?? false;
  const [fetchOlder, { isFetching: loadingOlder }] = useLazyFetchOlderMessagesQuery();
  const [fetchNew] = useLazyFetchNewMessagesQuery();
  const { data: readState } = useGetGuildChatReadStateQuery(activeGuildId ?? '', { skip: !activeGuildId });
  const [addMessage, { isLoading: isAdding }] = useAddGuildMessageMutation();
  const [updateMessage, updateState] = useUpdateGuildMessageMutation();
  const [deleteMessage, deleteState] = useDeleteGuildMessageMutation();
  const [markRead] = useMarkGuildChatReadMutation();
  const [isUploading, setIsUploading] = useState(false);

  const messagesRef = useRef<GuildMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  });
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!activeGuildId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      supabase.realtime.setAuth(sessionData.session?.access_token ?? null);
      if (!active) return;

      const filter = `guild_id=eq.${activeGuildId}`;
      channel = supabase
        .channel(`guild-chat:${activeGuildId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'guild_messages', filter },
          () => {
            const last = messagesRef.current.at(-1);
            fetchNew({
              guildId: activeGuildId,
              after: last?.createdAt ?? new Date(0).toISOString(),
            });
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'guild_messages', filter },
          (payload) => {
            const row = payload.new as {
              id: string;
              body: string;
              updated_at: string;
              attachment_url: string | null;
            };
            dispatch(
              guildMessageApi.util.updateQueryData('getGuildMessages', activeGuildId, (draft) => {
                const m = draft.messages.find((x) => x.id === row.id);
                if (m) {
                  m.body = row.body;
                  m.updatedAt = row.updated_at;
                  m.attachmentUrl = row.attachment_url;
                }
              }),
            );
          },
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'guild_messages', filter },
          (payload) => {
            const id = (payload.old as { id?: string }).id;
            if (!id) return;
            dispatch(
              guildMessageApi.util.updateQueryData('getGuildMessages', activeGuildId, (draft) => {
                const idx = draft.messages.findIndex((x) => x.id === id);
                if (idx !== -1) draft.messages.splice(idx, 1);
              }),
            );
          },
        )
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeGuildId, supabase, fetchNew, dispatch]);

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

  const handleSubmit = async (body: string, file?: File | null) => {
    if (!activeGuildId) return;
    let attachmentUrl: string | null = null;
    if (file && userId) {
      setIsUploading(true);
      try {
        attachmentUrl = await uploadChatAttachment(userId, file);
      } catch {
        toast.error(t('attachmentError'));
        throw new Error('Attachment error');
      } finally {
        setIsUploading(false);
      }
    }
    try {
      await addMessage({
        guildId: activeGuildId,
        body,
        attachmentUrl,
        author: userId && viewerProfile ? { userId, profile: viewerProfile } : undefined,
      }).unwrap();
    } catch {
      toast.error(t('sendError'));
      throw new Error('Send error');
    }
  };

  const handleEdit = async (id: string, body: string) => {
    if (!activeGuildId) return;
    try {
      await updateMessage({ guildId: activeGuildId, messageId: id, body }).unwrap();
    } catch {
      toast.error(t('updateError'));
      throw new Error('Update error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeGuildId) return;
    try {
      await deleteMessage({ guildId: activeGuildId, messageId: id }).unwrap();
    } catch {
      toast.error(t('deleteError'));
      throw new Error('Delete error');
    }
  };

  const threadMessages: ChatThreadMessage[] = messages.map(m => ({
    id: m.id,
    userId: m.userId,
    body: m.body,
    attachmentUrl: m.attachmentUrl,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    profile: m.profile,
  }));

  const labels = {
    empty: t('empty'),
    loadingOlder: t('loadingOlder'),
    placeholder: t('placeholder'),
    lockedPrompt: t('lockedPrompt'),
    send: t('send'),
    save: t('save'),
    cancel: t('cancel'),
    editing: t('editing'),
    attach: t('attach'),
    removeAttachment: t('removeAttachment'),
    today: t('today'),
    yesterday: t('yesterday'),
    edited: t('edited'),
    edit: t('edit'),
    delete: t('delete'),
    confirmDelete: t('confirmDelete'),
    closeLightbox: t('closeLightbox'),
  };

  return (
    <ChatThread
      messages={threadMessages}
      currentUserId={userId}
      isLoading={isLoading}
      loadingOlder={loadingOlder}
      hasMore={hasMore}
      onLoadOlder={(beforeIso) => {
        if (activeGuildId) fetchOlder({ guildId: activeGuildId, before: beforeIso });
      }}
      onSubmit={handleSubmit}
      onEdit={handleEdit}
      onDelete={handleDelete}
      isSubmitting={isAdding || updateState.isLoading || isUploading}
      deletingId={deleteState.isLoading ? deleteState.originalArgs?.messageId : null}
      canWrite={!!userId}
      resetKey={activeGuildId}
      header={
        <div className={styles.guildSelect}>
          <GuildSelect value={activeGuildId} onValueChange={handleGuildChange} options={guildOptions} />
        </div>
      }
      labels={labels}
      locale={locale}
    />
  );
};
