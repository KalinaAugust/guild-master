'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MessageBubble } from '@/shared/ui/MessageBubble';
import type { EventComment } from '@/entities/comment';
import { resolveDisplayName } from '@/entities/user';

interface CommentItemProps {
  comment: EventComment;
  isOwn: boolean;
  onSave?: (body: string) => void | Promise<void>;
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

  return (
    <MessageBubble
      authorName={resolveDisplayName({
        fullName: comment.profile.fullName,
        alias: comment.profile.alias,
        displayAsAlias: comment.profile.displayAsAlias,
      })}
      avatarUrl={comment.profile.avatarUrl}
      profilePublicId={comment.profile.publicId}
      body={comment.body}
      createdAt={comment.createdAt}
      updatedAt={comment.updatedAt}
      isOwn={isOwn}
      locale={locale}
      labels={{
        edited: t('edited'),
        edit: t('edit'),
        delete: t('delete'),
        save: t('save'),
        cancel: t('cancel'),
        confirmDelete: t('confirmDelete'),
      }}
      maxLength={2000}
      onSave={onSave}
      onDelete={onDelete}
      isSaving={isSaving}
      isDeleting={isDeleting}
    />
  );
};
