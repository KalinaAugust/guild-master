'use client';

import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import dayjs from '@/shared/lib/dayjs';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import styles from './MessageBubble.module.css';

export interface MessageBubbleLabels {
  edited: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  confirmDelete: string;
}

interface MessageBubbleProps {
  authorName: string | null;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  isOwn: boolean;
  locale: string;
  labels: MessageBubbleLabels;
  maxLength?: number;
  onSave?: (body: string) => void | Promise<void>;
  onDelete?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  authorName,
  avatarUrl,
  body,
  createdAt,
  updatedAt,
  isOwn,
  locale,
  labels,
  maxLength = 2000,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isEdited = dayjs(updatedAt).diff(dayjs(createdAt), 'second') > 2;
  const time = dayjs(createdAt).locale(locale).fromNow();

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    try {
      await onSave?.(trimmed);
      setIsEditing(false);
    } catch {
      // Keep edit mode open so the draft is preserved; the consumer shows the error toast.
    }
  };

  const handleCancel = () => {
    setDraft(body);
    setIsEditing(false);
  };

  return (
    <div className={`${styles.item} ${isOwn ? styles.own : ''}`}>
      {!isOwn && <UserAvatar avatarUrl={avatarUrl} name={authorName} size="md" />}
      <div className={styles.body}>
        <div className={styles.head}>
          {!isOwn && <span className={styles.name}>{authorName || '—'}</span>}
          <span className={styles.meta}>{time}</span>
          {isEdited && (
            <>
              <span className={styles.meta} aria-hidden>·</span>
              <span className={styles.meta}>{labels.edited}</span>
            </>
          )}
        </div>

        {isEditing ? (
          <>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} maxLength={maxLength} />
            <div className={styles.editActions}>
              <Button type="button" size="xs" variant="primary" onClick={handleSave} isLoading={isSaving}>
                {labels.save}
              </Button>
              <Button type="button" size="xs" variant="secondary" onClick={handleCancel} disabled={isSaving}>
                {labels.cancel}
              </Button>
            </div>
          </>
        ) : (
          <p className={styles.text}>{body}</p>
        )}
      </div>

      {isOwn && !isEditing && (
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            size="icon_sm"
            aria-label={labels.edit}
            className={styles.actionBtn}
            onClick={() => setIsEditing(true)}
          >
            <Edit2 size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon_sm"
            aria-label={labels.delete}
            className={styles.deleteBtn}
            onClick={() => setConfirmOpen(true)}
            isLoading={isDeleting}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { onDelete?.(); setConfirmOpen(false); }}
        title={labels.delete}
        description={labels.confirmDelete}
        confirmLabel={labels.delete}
      />
    </div>
  );
};
