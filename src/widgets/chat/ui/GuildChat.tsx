'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { toast } from 'sonner';
import { Panel } from '@/shared/ui/Panel';
import { MessageBubble } from '@/shared/ui/MessageBubble';
import { MessageComposer } from '@/shared/ui/MessageComposer';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import type { Guild } from '@/entities/guild';
import { uploadChatAttachment, type GuildMessage } from '@/entities/guild-message';
import { resolveDisplayName } from '@/entities/user';
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
import { MessagesSkeleton } from './ChatSkeletons';
import styles from './GuildChat.module.css';

const formatDayLabel = (
  iso: string,
  locale: string,
  labels: { today: string; yesterday: string },
) => {
  const day = dayjs(iso).locale(locale);
  const now = dayjs();
  if (day.isSame(now, 'day')) return labels.today;
  if (day.isSame(now.subtract(1, 'day'), 'day')) return labels.yesterday;
  const sameYear = day.isSame(now, 'year');
  if (!sameYear) return day.format('LL');
  return day.format(locale === 'ru' ? 'D MMMM' : 'MMMM D');
};

interface GuildChatProps {
  guilds: Guild[];
  userId?: string;
  /** Viewer's profile, used to render optimistically-sent messages instantly. */
  viewerProfile?: GuildMessage['profile'];
  initialGuildId?: string;
}

export const GuildChat: React.FC<GuildChatProps> = ({ guilds, userId, viewerProfile, initialGuildId }) => {
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
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Latest messages snapshot, read inside the Realtime callback without
  // re-subscribing the channel on every new message.
  const messagesRef = useRef<GuildMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  });
  const supabase = useMemo(() => createClient(), []);

  // Realtime guild chat: an INSERT is just a signal to pull the enriched delta
  // (the raw row carries no joined profile); UPDATE/DELETE patch the cache by id.
  useEffect(() => {
    if (!activeGuildId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      // Authorise the Realtime socket so RLS (guild membership) lets the
      // subscription through.
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

  const pendingScrollRef = useRef(true);
  const isAtBottomRef = useRef(true);
  // When set, the last list change prepended older messages; holds the pre-update
  // scrollHeight so we can keep the viewport anchored instead of jumping up.
  const prependAnchorRef = useRef<number | null>(null);

  useEffect(() => {
    pendingScrollRef.current = true;
    prependAnchorRef.current = null;
  }, [activeGuildId]);

  // Switching guilds discards any in-progress edit (the message belongs to the
  // previous guild's thread).
  const handleGuildSwitch = (id: string) => {
    setEditing(null);
    handleGuildChange(id);
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    // Near the top: pull the previous page and anchor the viewport across it.
    if (el.scrollTop < 120 && hasMore && !loadingOlder && activeGuildId && messages[0]) {
      prependAnchorRef.current = el.scrollHeight;
      fetchOlder({ guildId: activeGuildId, before: messages[0].createdAt });
    }
  };

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // Older page prepended → preserve scroll position (no jump to top).
    if (prependAnchorRef.current != null) {
      el.scrollTop += el.scrollHeight - prependAnchorRef.current;
      prependAnchorRef.current = null;
      return;
    }
    // Initial load or a new message while pinned to the bottom → stick to bottom.
    if (pendingScrollRef.current || isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      pendingScrollRef.current = false;
    }
  }, [messages.length]);

  const labels = {
    edited: t('edited'),
    edit: t('edit'),
    delete: t('delete'),
    confirmDelete: t('confirmDelete'),
    closeImage: t('closeLightbox'),
  };

  // Single composer entry point: save the message being edited, otherwise send a
  // new one. On a failed edit we keep edit mode so the draft is preserved.
  const handleComposerSubmit = async (body: string, file?: File | null) => {
    if (!activeGuildId) return;
    if (editing) {
      try {
        await updateMessage({ guildId: activeGuildId, messageId: editing.id, body }).unwrap();
        setEditing(null);
      } catch {
        toast.error(t('updateError'));
      }
      return;
    }
    // Upload the attachment first (if any) so the message carries a public URL.
    let attachmentUrl: string | null = null;
    if (file && userId) {
      setIsUploading(true);
      try {
        attachmentUrl = await uploadChatAttachment(userId, file);
      } catch {
        toast.error(t('attachmentError'));
        return;
      } finally {
        setIsUploading(false);
      }
    }
    pendingScrollRef.current = true;
    try {
      await addMessage({
        guildId: activeGuildId,
        body,
        attachmentUrl,
        author: userId && viewerProfile ? { userId, profile: viewerProfile } : undefined,
      }).unwrap();
    } catch {
      toast.error(t('sendError'));
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!activeGuildId) return;
    try {
      await deleteMessage({ guildId: activeGuildId, messageId }).unwrap();
      if (editing?.id === messageId) setEditing(null);
    } catch {
      toast.error(t('deleteError'));
    }
  };

  return (
    <Panel className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.guildSelect}>
          <GuildSelect value={activeGuildId} onValueChange={handleGuildSwitch} options={guildOptions} />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.chat}>
          <div className={styles.list} ref={listRef} onScroll={handleScroll}>
            {isLoading && <MessagesSkeleton />}
            {!isLoading && loadingOlder && (
              <p className={styles.loadingOlder}>{t('loadingOlder')}</p>
            )}
            {!isLoading && messages.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
            {!isLoading && messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDayDivider =
                !prev || !dayjs(prev.createdAt).isSame(dayjs(m.createdAt), 'day');
              return (
                <React.Fragment key={m.id}>
                  {showDayDivider && (
                    <div className={styles.dayDivider}>
                      <span className={styles.dayDividerLabel}>
                        {formatDayLabel(m.createdAt, locale, {
                          today: t('today'),
                          yesterday: t('yesterday'),
                        })}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    authorName={resolveDisplayName({
                      fullName: m.profile.fullName,
                      alias: m.profile.alias,
                      displayAsAlias: m.profile.displayAsAlias,
                    })}
                    authorIcon={m.profile.icon}
                    avatarUrl={m.profile.avatarUrl}
                    profilePublicId={m.profile.publicId}
                    body={m.body}
                    attachmentUrl={m.attachmentUrl}
                    createdAt={m.createdAt}
                    updatedAt={m.updatedAt}
                    isOwn={m.userId === userId}
                    isEditing={editing?.id === m.id}
                    locale={locale}
                    labels={labels}
                    onEdit={() => setEditing({ id: m.id, body: m.body })}
                    onDelete={() => handleDelete(m.id)}
                    isDeleting={deleteState.isLoading && deleteState.originalArgs?.messageId === m.id}
                  />
                </React.Fragment>
              );
            })}
          </div>
          <MessageComposer
            canWrite={!!userId}
            onSubmit={handleComposerSubmit}
            isSubmitting={isAdding || updateState.isLoading || isUploading}
            placeholder={t('placeholder')}
            sendLabel={editing ? t('save') : t('send')}
            lockedPrompt={t('lockedPrompt')}
            maxLength={2000}
            editing={!!editing}
            editingKey={editing?.id}
            initialValue={editing?.body}
            onCancelEdit={() => setEditing(null)}
            editLabel={t('editing')}
            cancelEditLabel={t('cancel')}
            allowAttachment
            attachLabel={t('attach')}
            removeAttachmentLabel={t('removeAttachment')}
          />
        </div>

      </div>
    </Panel>
  );
};
