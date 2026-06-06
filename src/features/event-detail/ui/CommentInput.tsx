'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Send } from 'lucide-react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea: reset height, then match it to the content.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  if (!canWrite) {
    return <p className={styles.locked}>{t('lockedPrompt')}</p>;
  }

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  // Enter sends; Shift+Enter inserts a newline.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('placeholder')}
        rows={1}
        maxLength={2000}
      />
      {isSubmitting ? (
        <span className={styles.spinner} role="status" aria-label={t('send')} />
      ) : (
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className={styles.sendButton}
          disabled={!value.trim()}
          aria-label={t('send')}
        >
          <Send size={26} />
        </Button>
      )}
    </form>
  );
};
