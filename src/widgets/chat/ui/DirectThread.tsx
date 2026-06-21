'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { toast } from 'sonner';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { uploadChatAttachment } from '@/shared/api/chatAttachments';
import { createClient } from '@/shared/api/supabase/client';
import { useAppDispatch } from '@/shared/lib/hooks';
import { resolveDisplayName } from '@/entities/user';
import type { DmProfile, DirectMessage } from '@/entities/direct-message';
import {
  directMessageApi,
  useGetDirectMessagesQuery,
  useLazyFetchOlderDirectMessagesQuery,
  useLazyFetchNewDirectMessagesQuery,
  useGetDmReadStateQuery,
  useAddDirectMessageMutation,
  useUpdateDirectMessageMutation,
  useDeleteDirectMessageMutation,
  useMarkDmReadMutation,
} from '@/entities/direct-message';
import { ChatThread, type ChatThreadMessage } from './ChatThread';
import styles from './DirectThread.module.css';

interface DirectThreadProps {
  peerPublicId: string;
  peer: DmProfile & { id: string; lastSeenAt: string | null };
  viewerProfile?: DmProfile;
  userId?: string;
}

export const DirectThread: React.FC<DirectThreadProps> = ({
  peerPublicId,
  peer,
  viewerProfile,
  userId,
}) => {
  const t = useTranslations('DirectMessages');
  const locale = useLocale();
  const dispatch = useAppDispatch();

  const { data, isLoading } = useGetDirectMessagesQuery(peerPublicId, {
    skip: !peerPublicId,
    refetchOnFocus: true,
  });
  const messages = data?.messages ?? [];
  const hasMore = data?.hasMore ?? false;
  
  const [fetchOlder, { isFetching: loadingOlder }] = useLazyFetchOlderDirectMessagesQuery();
  const [fetchNew] = useLazyFetchNewDirectMessagesQuery();
  const { data: readState } = useGetDmReadStateQuery(peerPublicId, { skip: !peerPublicId });
  
  const [addMessage, { isLoading: isAdding }] = useAddDirectMessageMutation();
  const [updateMessage, updateState] = useUpdateDirectMessageMutation();
  const [deleteMessage, deleteState] = useDeleteDirectMessageMutation();
  const [markRead] = useMarkDmReadMutation();
  const [isUploading, setIsUploading] = useState(false);

  const messagesRef = useRef<DirectMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  });

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!userId || !peer.id) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      supabase.realtime.setAuth(sessionData.session?.access_token ?? null);
      if (!active) return;

      const filter = `recipient_id=eq.${userId}`;
      channel = supabase
        .channel(`dm-chat:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'direct_messages', filter },
          (payload) => {
            const row = payload.new as { sender_id: string };
            if (row.sender_id !== peer.id) return;
            const last = messagesRef.current.at(-1);
            fetchNew({
              peerId: peerPublicId,
              after: last?.createdAt ?? new Date(0).toISOString(),
            });
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'direct_messages', filter },
          (payload) => {
            const row = payload.new as {
              id: string;
              sender_id: string;
              body: string;
              updated_at: string;
              attachment_url: string | null;
            };
            if (row.sender_id !== peer.id) return;
            dispatch(
              directMessageApi.util.updateQueryData('getDirectMessages', peerPublicId, (draft) => {
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
          { event: 'DELETE', schema: 'public', table: 'direct_messages', filter },
          (payload) => {
            const id = (payload.old as { id?: string }).id;
            if (!id) return;
            dispatch(
              directMessageApi.util.updateQueryData('getDirectMessages', peerPublicId, (draft) => {
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
  }, [userId, peer.id, peerPublicId, supabase, fetchNew, dispatch]);

  const hasUnread =
    !!readState &&
    messages.some(
      (m) =>
        m.senderId !== userId &&
        (!readState.lastReadAt || m.createdAt > readState.lastReadAt),
    );

  useEffect(() => {
    if (peerPublicId && hasUnread) markRead(peerPublicId);
  }, [peerPublicId, hasUnread, markRead]);

  const handleSubmit = async (body: string, file?: File | null) => {
    if (!peerPublicId) return;
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
        peerId: peerPublicId,
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
    if (!peerPublicId) return;
    try {
      await updateMessage({ peerId: peerPublicId, messageId: id, body }).unwrap();
    } catch {
      toast.error(t('updateError'));
      throw new Error('Update error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!peerPublicId) return;
    try {
      await deleteMessage({ peerId: peerPublicId, messageId: id }).unwrap();
    } catch {
      toast.error(t('deleteError'));
      throw new Error('Delete error');
    }
  };

  const threadMessages: ChatThreadMessage[] = messages.map(m => ({
    id: m.id,
    userId: m.senderId,
    body: m.body,
    attachmentUrl: m.attachmentUrl,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    profile: m.senderProfile,
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

  const isOnline =
    peer.lastSeenAt && dayjs().diff(peer.lastSeenAt, 'minute') < 5;
  const presenceLine = isOnline
    ? t('online')
    : peer.lastSeenAt
      ? t('lastSeen', {
          time: dayjs(peer.lastSeenAt).locale(locale).fromNow(),
        })
      : '';

  const header = (
    <Link href={`/profile/${peerPublicId}`} className={styles.headerInfo}>
      <UserAvatar
        avatarUrl={peer.avatarUrl}
        name={peer.alias ?? peer.fullName ?? ''}
        size="lg"
      />
      <div className={styles.headerText}>
        <span className={styles.peerName}>
          {resolveDisplayName({
            fullName: peer.fullName,
            alias: peer.alias,
            displayAsAlias: peer.displayAsAlias,
          })}
        </span>
        <span className={isOnline ? styles.presenceOnline : styles.presenceOffline}>
          {presenceLine}
        </span>
      </div>
    </Link>
  );

  return (
    <ChatThread
      messages={threadMessages}
      currentUserId={userId}
      isLoading={isLoading}
      loadingOlder={loadingOlder}
      hasMore={hasMore}
      onLoadOlder={(beforeIso) => {
        if (peerPublicId) fetchOlder({ peerId: peerPublicId, before: beforeIso });
      }}
      onSubmit={handleSubmit}
      onEdit={handleEdit}
      onDelete={handleDelete}
      isSubmitting={isAdding || updateState.isLoading || isUploading}
      deletingId={deleteState.isLoading ? deleteState.originalArgs?.messageId : null}
      canWrite={!!userId}
      resetKey={peerPublicId}
      header={header}
      labels={labels}
      locale={locale}
    />
  );
};
