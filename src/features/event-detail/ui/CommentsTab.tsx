'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  useGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
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
  const [updateComment] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comments.length]);

  const handleAdd = async (body: string) => {
    try {
      await addComment({ eventId, body }).unwrap();
    } catch {
      toast.error(t('sendError'));
    }
  };

  const handleUpdate = async (commentId: string, body: string) => {
    try {
      await updateComment({ eventId, commentId, body }).unwrap();
    } catch {
      toast.error(t('updateError'));
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
          />
        ))}
      </div>
      <CommentInput canWrite={canWrite} onSubmit={handleAdd} isSubmitting={isAdding} />
    </div>
  );
};
