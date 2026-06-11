'use client';

import React, { useState } from 'react';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import dayjs from '@/shared/lib/dayjs';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { NameWithIcon } from '@/shared/ui/NameWithIcon';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import styles from './MessageBubble.module.css';

const renderBodyWithLargeEmojis = (text: string) => {
  // Split the text while preserving matched individual emoji characters (no '+' quantifier)
  const parts = text.split(/(\p{Extended_Pictographic})/gu);
  return parts.map((part, idx) => {
    if (/^\p{Extended_Pictographic}$/gu.test(part)) {
      return (
        <span key={idx} className={styles.emoji}>
          {part}
        </span>
      );
    }
    return part;
  });
};

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
  authorIcon?: string | null;
  avatarUrl: string | null;
  /** When set, the author's avatar and name link to their public profile. */
  profilePublicId?: string | null;
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
  authorIcon,
  avatarUrl,
  profilePublicId,
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
      {!isOwn && (
        <ProfileLink publicId={profilePublicId} aria-label={authorName ?? undefined}>
          <UserAvatar avatarUrl={avatarUrl} name={authorName} size="md" />
        </ProfileLink>
      )}
      <div className={styles.body}>
        <div className={styles.head}>
          {!isOwn && (
            <ProfileLink publicId={profilePublicId} className={styles.name}>
              <NameWithIcon name={authorName} icon={authorIcon} fallback="—" iconSize={14} />
            </ProfileLink>
          )}
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
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={maxLength}
              className={styles.editTextarea}
            />
            <div className={styles.editActions}>
              <Button
                type="button"
                variant="ghost"
                size="icon_sm"
                onClick={handleSave}
                isLoading={isSaving}
                aria-label={labels.save}
                className={styles.saveBtn}
              >
                <Check size={20} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon_sm"
                onClick={handleCancel}
                disabled={isSaving}
                aria-label={labels.cancel}
                className={styles.cancelBtn}
              >
                <X size={20} />
              </Button>
            </div>
          </>
        ) : (
          <p className={styles.text}>{renderBodyWithLargeEmojis(body)}</p>
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
