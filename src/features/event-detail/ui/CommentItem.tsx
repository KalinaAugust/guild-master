'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { MessageBubble } from '@/shared/ui/MessageBubble';
import type { EventComment } from '@/entities/comment';
import { resolveDisplayName } from '@/entities/user';

interface CommentItemProps {
  comment: EventComment;
  isOwn: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isOwn,
  isEditing = false,
  onEdit,
  onDelete,
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
      authorIcon={comment.profile.icon}
      avatarUrl={comment.profile.avatarUrl}
      profilePublicId={comment.profile.publicId}
      body={comment.body}
      createdAt={comment.createdAt}
      updatedAt={comment.updatedAt}
      isOwn={isOwn}
      isEditing={isEditing}
      locale={locale}
      labels={{
        edited: t('edited'),
        edit: t('edit'),
        delete: t('delete'),
        confirmDelete: t('confirmDelete'),
      }}
      onEdit={onEdit}
      onDelete={onDelete}
      isDeleting={isDeleting}
    />
  );
};
