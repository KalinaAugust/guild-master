'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  useGetCommentsQuery,
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
  const listRef = useRef<HTMLDivElement>(null);

  // Opening the tab (and any comment arriving while it stays open) marks the
  // thread read for this user, clearing the tab badge and bell notification.
  useEffect(() => {
    markCommentsRead(eventId);
  }, [eventId, comments.length, markCommentsRead]);
  // Scroll to the latest comment on initial load and after the viewer sends one,
  // but not when a poll pulls in someone else's comment (would hijack scroll).
  const pendingScrollRef = useRef(true);

  useEffect(() => {
    if (pendingScrollRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
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
      <div className={styles.list} ref={listRef}>
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
