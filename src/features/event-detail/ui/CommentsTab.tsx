'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  useGetCommentsQuery,
  useGetCommentReadStateQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useMarkCommentsReadMutation,
} from '@/entities/comment';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import styles from './CommentsTab.module.css';

interface CommentsTabProps {
  eventId: string;
  canWrite: boolean;
  currentUserId: string;
}

export const CommentsTab: React.FC<CommentsTabProps> = ({ eventId, canWrite, currentUserId }) => {
  const t = useTranslations('EventComments');
  const { data: comments = [], isLoading } = useGetCommentsQuery(eventId, {
    pollingInterval: 60_000,
    refetchOnFocus: true,
    skipPollingIfUnfocused: true,
  });
  const [addComment, { isLoading: isAdding }] = useAddCommentMutation();
  const [updateComment, updateState] = useUpdateCommentMutation();
  const [deleteComment, deleteState] = useDeleteCommentMutation();
  const [markCommentsRead] = useMarkCommentsReadMutation();
  const { data: readState } = useGetCommentReadStateQuery(eventId);
  const listRef = useRef<HTMLDivElement>(null);

  // Whether the thread holds comments from others the viewer hasn't seen yet.
  const hasUnread =
    !!readState &&
    comments.some(
      (c) =>
        c.userId !== currentUserId &&
        (!readState.lastReadAt || c.createdAt > readState.lastReadAt),
    );

  // Mark the thread read only when there is something unread — opening (or
  // re-opening) an already-read thread must not fire a write + cache refetches.
  // Clearing the read state also clears the tab badge and bell notification.
  useEffect(() => {
    if (hasUnread) markCommentsRead(eventId);
  }, [eventId, hasUnread, markCommentsRead]);
  // Auto-scroll to the latest comment on initial load, after the viewer sends
  // one, or when a new comment arrives while the viewer is already at the bottom.
  // If the viewer has scrolled up to read older comments, leave scroll untouched.
  const pendingScrollRef = useRef(true);
  const isAtBottomRef = useRef(true);

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
  }, [comments.length]);

  const handleAdd = async (body: string) => {
    try {
      await addComment({ eventId, body }).unwrap();
      pendingScrollRef.current = true;
    } catch {
      toast.error(t('sendError'));
    }
  };

  const handleUpdate = async (commentId: string, body: string) => {
    try {
      await updateComment({ eventId, commentId, body }).unwrap();
    } catch (e) {
      toast.error(t('updateError'));
      throw e;
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment({ eventId, commentId }).unwrap();
    } catch {
      toast.error(t('deleteError'));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.list} ref={listRef} onScroll={handleScroll}>
        {!isLoading && comments.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
        {comments.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            isOwn={c.userId === currentUserId}
            onSave={(body) => handleUpdate(c.id, body)}
            onDelete={() => handleDelete(c.id)}
            isSaving={updateState.isLoading && updateState.originalArgs?.commentId === c.id}
            isDeleting={deleteState.isLoading && deleteState.originalArgs?.commentId === c.id}
          />
        ))}
      </div>
      <CommentInput canWrite={canWrite} onSubmit={handleAdd} isSubmitting={isAdding} />
    </div>
  );
};
