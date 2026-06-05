'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import styles from './CommentInput.module.css';

interface CommentInputProps {
  canWrite: boolean;
  onSubmit: (body: string) => void;
  isSubmitting?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({ canWrite, onSubmit, isSubmitting = false }) => {
  const t = useTranslations('EventComments');
  const [value, setValue] = useState('');

  if (!canWrite) {
    return <p className={styles.locked}>{t('lockedPrompt')}</p>;
  }

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('placeholder')}
        rows={2}
        maxLength={2000}
      />
      <div className={styles.actions}>
        <Button type="submit" size="sm" variant="primary" isLoading={isSubmitting}>
          {t('send')}
        </Button>
      </div>
    </form>
  );
};
