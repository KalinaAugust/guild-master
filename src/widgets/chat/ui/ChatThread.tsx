'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import dayjs from '@/shared/lib/dayjs';
import { Panel } from '@/shared/ui/Panel';
import { MessageBubble } from '@/shared/ui/MessageBubble';
import { MessageComposer } from '@/shared/ui/MessageComposer';
import { resolveDisplayName } from '@/entities/user';
import type { DmProfile } from '@/entities/direct-message';
import { MessagesSkeleton } from './ChatSkeletons';
import styles from './ChatThread.module.css';

export interface ChatThreadMessage {
  id: string;
  userId: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  profile: DmProfile;
}

export interface ChatThreadLabels {
  empty: string;
  loadingOlder: string;
  placeholder: string;
  lockedPrompt: string;
  send: string;
  save: string;
  cancel: string;
  editing: string;
  attach: string;
  removeAttachment: string;
  today: string;
  yesterday: string;
  edited: string;
  edit: string;
  delete: string;
  confirmDelete: string;
  closeLightbox: string;
}

interface ChatThreadProps {
  messages: ChatThreadMessage[];
  currentUserId?: string;
  isLoading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  onLoadOlder: (beforeIso: string) => void;
  onSubmit: (body: string, file?: File | null) => Promise<void>;
  onEdit: (id: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isSubmitting: boolean;
  deletingId?: string | null;
  canWrite: boolean;
  /** Reset signal — when it changes, in-progress edit and scroll anchor reset. */
  resetKey?: string;
  header?: React.ReactNode;
  labels: ChatThreadLabels;
  locale: string;
}

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

export const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  currentUserId,
  isLoading,
  loadingOlder,
  hasMore,
  onLoadOlder,
  onSubmit,
  onEdit,
  onDelete,
  isSubmitting,
  deletingId,
  canWrite,
  resetKey,
  header,
  labels,
  locale,
}) => {
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const pendingScrollRef = useRef(true);
  const isAtBottomRef = useRef(true);
  // When set, the last list change prepended older messages; holds the pre-update
  // scrollHeight so we can keep the viewport anchored instead of jumping up.
  const prependAnchorRef = useRef<number | null>(null);

  // A reset (e.g. switching guild/conversation) discards any in-progress edit
  // and re-pins to the bottom for the new thread.
  useEffect(() => {
    setEditing(null);
    pendingScrollRef.current = true;
    prependAnchorRef.current = null;
  }, [resetKey]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    // Near the top: pull the previous page and anchor the viewport across it.
    if (el.scrollTop < 120 && hasMore && !loadingOlder && messages[0]) {
      prependAnchorRef.current = el.scrollHeight;
      onLoadOlder(messages[0].createdAt);
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

  const bubbleLabels = {
    edited: labels.edited,
    edit: labels.edit,
    delete: labels.delete,
    confirmDelete: labels.confirmDelete,
    closeImage: labels.closeLightbox,
  };

  // Single composer entry point: save the message being edited, otherwise send a
  // new one. On a failed edit we keep edit mode so the draft is preserved.
  const handleComposerSubmit = async (body: string, file?: File | null) => {
    if (editing) {
      await onEdit(editing.id, body);
      setEditing(null);
      return;
    }
    pendingScrollRef.current = true;
    await onSubmit(body, file);
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
    if (editing?.id === id) setEditing(null);
  };

  return (
    <Panel className={styles.panel}>
      <div className={styles.header}>{header}</div>

      <div className={styles.body}>
        <div className={styles.chat}>
          <div className={styles.list} ref={listRef} onScroll={handleScroll}>
            {isLoading && <MessagesSkeleton />}
            {!isLoading && loadingOlder && (
              <p className={styles.loadingOlder}>{labels.loadingOlder}</p>
            )}
            {!isLoading && messages.length === 0 && <p className={styles.empty}>{labels.empty}</p>}
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
                          today: labels.today,
                          yesterday: labels.yesterday,
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
                    isOwn={m.userId === currentUserId}
                    isEditing={editing?.id === m.id}
                    locale={locale}
                    labels={bubbleLabels}
                    onEdit={() => setEditing({ id: m.id, body: m.body })}
                    onDelete={() => handleDelete(m.id)}
                    isDeleting={deletingId === m.id}
                  />
                </React.Fragment>
              );
            })}
          </div>
          <MessageComposer
            canWrite={canWrite}
            onSubmit={handleComposerSubmit}
            isSubmitting={isSubmitting}
            placeholder={labels.placeholder}
            sendLabel={editing ? labels.save : labels.send}
            lockedPrompt={labels.lockedPrompt}
            maxLength={2000}
            editing={!!editing}
            editingKey={editing?.id}
            initialValue={editing?.body}
            onCancelEdit={() => setEditing(null)}
            editLabel={labels.editing}
            cancelEditLabel={labels.cancel}
            allowAttachment
            attachLabel={labels.attach}
            removeAttachmentLabel={labels.removeAttachment}
          />
        </div>
      </div>
    </Panel>
  );
};
