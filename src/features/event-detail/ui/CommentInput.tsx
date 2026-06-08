'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { MessageComposer } from '@/shared/ui/MessageComposer';

interface CommentInputProps {
  canWrite: boolean;
  onSubmit: (body: string) => void;
  isSubmitting?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({ canWrite, onSubmit, isSubmitting = false }) => {
  const t = useTranslations('EventComments');
  return (
    <MessageComposer
      canWrite={canWrite}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      placeholder={t('placeholder')}
      sendLabel={t('send')}
      lockedPrompt={t('lockedPrompt')}
      maxLength={2000}
    />
  );
};
