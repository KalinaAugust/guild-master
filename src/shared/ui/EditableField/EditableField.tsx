'use client';

import { useTranslations } from 'next-intl';
import { Pencil, Check, X } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';
import { useEditableField } from '@/shared/lib/useEditableField';
import styles from './EditableField.module.css';

export interface EditableFieldProps {
  initial: string;
  onSave: (value: string) => Promise<void>;
  successMessage: string;
  errorMessage: string;
  /** Lowercase noun used in aria-labels, e.g. "name". */
  label: string;
  /** Shown in view mode when the value is empty. */
  emptyText: string;
  inputPlaceholder?: string;
  maxLength?: number;
  multiline?: boolean;
  rows?: number;
}

export const EditableField = ({
  initial,
  onSave,
  successMessage,
  errorMessage,
  label,
  emptyText,
  inputPlaceholder,
  maxLength,
  multiline = false,
  rows = 3,
}: EditableFieldProps) => {
  const tc = useTranslations('Common');
  const { isEditing, value, setValue, saved, isSaving, isUnchanged, startEditing, cancel, save } =
    useEditableField<string>({
      initial,
      onSave,
      successMessage,
      errorMessage,
      normalize: (v) => v.trim(),
    });

  if (!isEditing) {
    const Text = multiline ? 'p' : 'span';
    return (
      <div className={multiline ? styles.viewMultiline : styles.view}>
        <Text className={saved ? styles.value : styles.placeholder}>{saved || emptyText}</Text>
        <Button
          variant="ghost"
          size="icon_sm"
          onClick={startEditing}
          aria-label={`${tc('edit')} ${label}`}
          className={styles.editButton}
        >
          <Pencil size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className={multiline ? styles.editMultiline : styles.edit}>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={maxLength}
          rows={rows}
          placeholder={inputPlaceholder}
          autoFocus
          disabled={isSaving}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={maxLength}
          placeholder={inputPlaceholder}
          autoFocus
          disabled={isSaving}
        />
      )}
      <div className={styles.actions}>
        <Button
          variant="ghost"
          size="icon_sm"
          onClick={save}
          isLoading={isSaving}
          disabled={isUnchanged}
          aria-label={tc('save')}
          className={styles.actionButton}
        >
          <Check size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon_sm"
          onClick={cancel}
          disabled={isSaving}
          aria-label={tc('cancel')}
          className={styles.actionButton}
        >
          <X size={18} />
        </Button>
      </div>
    </div>
  );
};
