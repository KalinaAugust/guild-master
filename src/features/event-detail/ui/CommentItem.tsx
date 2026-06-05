'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import type { EventComment } from '@/entities/comment';
import styles from './CommentItem.module.css';

interface CommentItemProps {
  comment: EventComment;
  isOwn: boolean;
  onSave?: (body: string) => void;
  onDelete?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isOwn,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}) => {
  const t = useTranslations('EventComments');
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isEdited = dayjs(comment.updatedAt).diff(dayjs(comment.createdAt), 'second') > 2;
  const time = dayjs(comment.createdAt).locale(locale).fromNow();

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSave?.(trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(comment.body);
    setIsEditing(false);
  };

  return (
    <div className={styles.item}>
      <UserAvatar avatarUrl={comment.profile.avatarUrl} name={comment.profile.fullName} size="md" />
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.name}>{comment.profile.fullName || '—'}</span>
          <span className={styles.meta}>{time}</span>
          {isEdited && (
            <>
              <span className={styles.meta} aria-hidden>·</span>
              <span className={styles.meta}>{t('edited')}</span>
            </>
          )}
        </div>

        {isEditing ? (
          <>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={2000} />
            <div className={styles.editActions}>
              <Button type="button" size="xs" variant="primary" onClick={handleSave} isLoading={isSaving}>
                {t('save')}
              </Button>
              <Button type="button" size="xs" variant="secondary" onClick={handleCancel} disabled={isSaving}>
                {t('cancel')}
              </Button>
            </div>
          </>
        ) : (
          <p className={styles.text}>{comment.body}</p>
        )}

        {isOwn && !isEditing && (
          <div className={styles.actions}>
            <Button type="button" size="xs" variant="secondary" onClick={() => setIsEditing(true)}>
              {t('edit')}
            </Button>
            <Button type="button" size="xs" variant="danger" onClick={() => setConfirmOpen(true)} isLoading={isDeleting}>
              {t('delete')}
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { onDelete?.(); setConfirmOpen(false); }}
        title={t('delete')}
        description={t('confirmDelete')}
        confirmLabel={t('delete')}
      />
    </div>
  );
};
