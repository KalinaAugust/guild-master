'use client';

import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Send, Check, X, Pencil, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { Spinner } from '@/shared/ui/Spinner';
import { ACCEPTED_IMAGE_ACCEPT, validateImageFile } from '@/shared/lib/imageValidation';
import { EmojiPicker } from './EmojiPicker';
import styles from './MessageComposer.module.css';

interface MessageComposerProps {
  canWrite: boolean;
  onSubmit: (body: string, file?: File | null) => void;
  isSubmitting?: boolean;
  placeholder: string;
  sendLabel: string;
  lockedPrompt: string;
  maxLength?: number;
  /** Edit mode: when true the composer is prefilled and saves instead of sends. */
  editing?: boolean;
  /** Identifies the edited message; changing it re-prefills the input. */
  editingKey?: string;
  /** Initial text to load when entering edit mode. */
  initialValue?: string;
  onCancelEdit?: () => void;
  editLabel?: string;
  cancelEditLabel?: string;
  /** Enables the image-attachment button (guild chat only). */
  allowAttachment?: boolean;
  attachLabel?: string;
  removeAttachmentLabel?: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  canWrite,
  onSubmit,
  isSubmitting = false,
  placeholder,
  sendLabel,
  lockedPrompt,
  maxLength = 2000,
  editing = false,
  editingKey,
  initialValue,
  onCancelEdit,
  editLabel,
  cancelEditLabel,
  allowAttachment = false,
  attachLabel,
  removeAttachmentLabel,
}) => {
  const [value, setValue] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Attachments are offered only outside edit mode (edits are text-only).
  const showAttach = allowAttachment && !editing;

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  // Auto-grow the textarea: reset height, then match it to the content.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // Prefill the input when the edit target changes (and clear it when leaving
  // edit mode) using React's render-phase "adjust state on prop change" pattern,
  // not an effect — this never clobbers in-progress typing.
  const editSession = editing ? editingKey ?? '__editing__' : undefined;
  const [prevSession, setPrevSession] = useState(editSession);
  if (editSession !== prevSession) {
    setPrevSession(editSession);
    setValue(editing ? initialValue ?? '' : '');
    if (editing) setFile(null);
  }

  // Focus + place the cursor at the end whenever a new edit session begins.
  useEffect(() => {
    if (!editSession) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    requestAnimationFrame(() => el.setSelectionRange(len, len));
  }, [editSession]);

  if (!canWrite) {
    return <p className={styles.locked}>{lockedPrompt}</p>;
  }

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const error = validateImageFile(picked);
    if (error) {
      toast.error(error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(picked);
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed && !file) return;
    onSubmit(trimmed, file);
    // In edit mode the parent clears `editing`, which resets the value via the
    // render-phase block above; only the send flow clears it here.
    if (!editing) {
      setValue('');
      clearFile();
    }
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  // Enter sends/saves; Shift+Enter inserts a newline; Esc cancels an edit.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    } else if (e.key === 'Escape' && editing) {
      e.preventDefault();
      onCancelEdit?.();
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

  const canSend = !!value.trim() || !!file;

  return (
    <div className={styles.wrapper}>
      {editing && (
        <div className={styles.editBar}>
          <Pencil size={14} className={styles.editBarIcon} />
          <span className={styles.editBarLabel}>{editLabel}</span>
          <button
            type="button"
            className={styles.editBarCancel}
            onClick={onCancelEdit}
            aria-label={cancelEditLabel}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {previewUrl && (
        <div className={styles.previewBar}>
          <Image
            src={previewUrl}
            alt=""
            width={56}
            height={56}
            unoptimized
            className={styles.previewThumb}
          />
          <button
            type="button"
            className={styles.previewRemove}
            onClick={clearFile}
            aria-label={removeAttachmentLabel}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <form className={styles.form} onSubmit={handleSubmit}>
        <EmojiPicker onSelectEmoji={handleSelectEmoji} disabled={isSubmitting} />
        {showAttach && (
          <>
            <button
              type="button"
              className={styles.attachButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              aria-label={attachLabel}
            >
              <Paperclip size={22} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept={ACCEPTED_IMAGE_ACCEPT}
              className={styles.hiddenInput}
            />
          </>
        )}
        <Textarea
          ref={textareaRef}
          className={`${styles.textarea} ${showAttach ? styles.textareaWithAttach : ''}`}
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
            disabled={!canSend}
            aria-label={sendLabel}
          >
            {editing ? <Check size={26} /> : <Send size={26} />}
          </Button>
        )}
      </form>
    </div>
  );
};
