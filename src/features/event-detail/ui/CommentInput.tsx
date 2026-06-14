'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { MessageComposer } from '@/shared/ui/MessageComposer';

interface CommentInputProps {
  canWrite: boolean;
  onSubmit: (body: string) => void;
  isSubmitting?: boolean;
  editing?: boolean;
  editingKey?: string;
  initialValue?: string;
  onCancelEdit?: () => void;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  canWrite,
  onSubmit,
  isSubmitting = false,
  editing = false,
  editingKey,
  initialValue,
  onCancelEdit,
}) => {
  const t = useTranslations('EventComments');
  return (
    <MessageComposer
      canWrite={canWrite}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      placeholder={t('placeholder')}
      sendLabel={editing ? t('save') : t('send')}
      lockedPrompt={t('lockedPrompt')}
      maxLength={2000}
      editing={editing}
      editingKey={editingKey}
      initialValue={initialValue}
      onCancelEdit={onCancelEdit}
      editLabel={t('editing')}
      cancelEditLabel={t('cancel')}
    />
  );
};
