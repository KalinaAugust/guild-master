'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Panel } from '@/shared/ui/Panel';
import { Button } from '@/shared/ui/Button';
import { MessageBubble } from '@/shared/ui/MessageBubble';
import { MessageComposer } from '@/shared/ui/MessageComposer';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import { PollCard, PollWizard } from '@/features/guild-poll';
import { useGetGuildPollsQuery } from '@/entities/poll';
import type { Guild } from '@/entities/guild';
import { uploadChatAttachment, type GuildMessage } from '@/entities/guild-message';
import { resolveDisplayName } from '@/entities/user';
import {
  useGetGuildMessagesQuery,
  useGetGuildChatReadStateQuery,
  useAddGuildMessageMutation,
  useUpdateGuildMessageMutation,
  useDeleteGuildMessageMutation,
  useMarkGuildChatReadMutation,
} from '@/entities/guild-message';
import { MessagesSkeleton, PollsSkeleton } from './ChatSkeletons';
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
  const pollT = useTranslations('GuildPoll');
  const locale = useLocale();
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds, initialGuildId, userId);

  const { data: messages = [], isLoading } = useGetGuildMessagesQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
    pollingInterval: 60_000,
    refetchOnFocus: true,
    skipPollingIfUnfocused: true,
  });
  const { data: readState } = useGetGuildChatReadStateQuery(activeGuildId ?? '', { skip: !activeGuildId });
  const { data: polls = [], isLoading: isPollsLoading } = useGetGuildPollsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });
  const [addMessage, { isLoading: isAdding }] = useAddGuildMessageMutation();
  const [updateMessage, updateState] = useUpdateGuildMessageMutation();
  const [deleteMessage, deleteState] = useDeleteGuildMessageMutation();
  const [markRead] = useMarkGuildChatReadMutation();
  const [isPollWizardOpen, setIsPollWizardOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
        <div className={styles.headerChat}>
          <div className={styles.guildSelect}>
            <GuildSelect value={activeGuildId} onValueChange={handleGuildSwitch} options={guildOptions} />
          </div>
        </div>
        <div className={styles.headerPolls}>
          <Button
            type="button"
            variant="primary"
            className={styles.newPollButton}
            onClick={() => setIsPollWizardOpen(true)}
            icon={<Plus size={18} strokeWidth={3} />}
          >
            {pollT('newPoll')}
          </Button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.chat}>
          <div className={styles.list} ref={listRef} onScroll={handleScroll}>
            {isLoading && <MessagesSkeleton />}
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

        <aside className={styles.polls}>
          {activeGuildId && isPollsLoading && <PollsSkeleton />}
          {activeGuildId && !isPollsLoading && polls.length === 0 && (
            <p className={styles.empty}>{pollT('emptyPolls')}</p>
          )}
          {activeGuildId &&
            !isPollsLoading &&
            polls.map((poll) => <PollCard key={poll.id} poll={poll} guildId={activeGuildId} />)}
        </aside>
      </div>

      {activeGuildId && (
        <PollWizard
          open={isPollWizardOpen}
          onClose={() => setIsPollWizardOpen(false)}
          guildId={activeGuildId}
        />
      )}
    </Panel>
  );
};
