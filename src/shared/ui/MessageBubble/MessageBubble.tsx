'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Edit2, Trash2 } from 'lucide-react';
import dayjs from '@/shared/lib/dayjs';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { NameWithIcon } from '@/shared/ui/NameWithIcon';
import { Button } from '@/shared/ui/Button';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
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
  confirmDelete: string;
  /** Accessible label for the image lightbox close button. */
  closeImage?: string;
}

interface MessageBubbleProps {
  authorName: string | null;
  authorIcon?: string | null;
  avatarUrl: string | null;
  /** When set, the author's avatar and name link to their public profile. */
  profilePublicId?: string | null;
  body: string;
  /** Optional image attachment URL rendered above the text. */
  attachmentUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  isOwn: boolean;
  /** Highlights the bubble while it is being edited in the composer. */
  isEditing?: boolean;
  locale: string;
  labels: MessageBubbleLabels;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  authorName,
  authorIcon,
  avatarUrl,
  profilePublicId,
  body,
  attachmentUrl,
  createdAt,
  updatedAt,
  isOwn,
  isEditing = false,
  locale,
  labels,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isEdited = dayjs(updatedAt).diff(dayjs(createdAt), 'second') > 2;
  const time = dayjs(createdAt).locale(locale).fromNow();

  // Bring the message into view when it starts being edited, so the user sees
  // what they're editing while typing in the fixed bottom composer.
  useEffect(() => {
    if (isEditing) rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isEditing]);

  return (
    <div ref={rootRef} className={`${styles.item} ${isOwn ? styles.own : ''} ${isEditing ? styles.editing : ''}`}>
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

        {attachmentUrl && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className={styles.attachment}
          >
            <Image
              src={attachmentUrl}
              alt=""
              width={320}
              height={320}
              unoptimized
              className={styles.attachmentImg}
            />
          </button>
        )}
        {body && <p className={styles.text}>{renderBodyWithLargeEmojis(body)}</p>}
      </div>

      {isOwn && (
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            size="icon_sm"
            aria-label={labels.edit}
            className={styles.actionBtn}
            onClick={onEdit}
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

      {attachmentUrl && (
        <ImageLightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          src={attachmentUrl}
          closeLabel={labels.closeImage}
        />
      )}
    </div>
  );
};
