'use client';

import React, { useState, useRef, useLayoutEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { EmojiPicker } from './EmojiPicker';
import styles from './MessageComposer.module.css';

interface MessageComposerProps {
  canWrite: boolean;
  onSubmit: (body: string) => void;
  isSubmitting?: boolean;
  placeholder: string;
  sendLabel: string;
  lockedPrompt: string;
  maxLength?: number;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  canWrite,
  onSubmit,
  isSubmitting = false,
  placeholder,
  sendLabel,
  lockedPrompt,
  maxLength = 2000,
}) => {
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
    return <p className={styles.locked}>{lockedPrompt}</p>;
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

  // Enter sends; Shift+Enter inserts a newline. Route through the form's
  // native submit so every send funnels through handleSubmit.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newValue = before + emoji + after;
    setValue(newValue);

    // Focus the textarea and set selection range right after the inserted emoji
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + emoji.length;
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <EmojiPicker onSelectEmoji={handleSelectEmoji} disabled={isSubmitting} />
      <Textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        maxLength={maxLength}
      />
      {isSubmitting ? (
        <Spinner className={styles.composerSpinner} aria-label={sendLabel} />
      ) : (
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className={styles.sendButton}
          disabled={!value.trim()}
          aria-label={sendLabel}
        >
          <Send size={26} />
        </Button>
      )}
    </form>
  );
};
