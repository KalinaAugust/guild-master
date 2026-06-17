'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Check, X } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { updateInterests } from '@/entities/user';
import { useEditableField } from '@/shared/lib/useEditableField';
import styles from './EditableInterests.module.css';

export const INTERESTS_MAX = 15;
const INTEREST_MAX_LEN = 30;

interface EditableInterestsProps {
  initialInterests: string[];
  userId: string;
  /** Notifies the parent block of edit state so it can render a header counter. */
  onEditStateChange?: (state: { isEditing: boolean; count: number }) => void;
}

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export const EditableInterests = ({
  initialInterests,
  userId,
  onEditStateChange,
}: EditableInterestsProps) => {
  const t = useTranslations('UpdateProfile');
  const tc = useTranslations('Common');
  const {
    isEditing,
    value: interests,
    setValue: setInterests,
    saved,
    isSaving,
    isUnchanged,
    startEditing,
    cancel,
    save,
  } = useEditableField<string[]>({
    initial: initialInterests,
    onSave: (v) => updateInterests(userId, v),
    successMessage: t('interests.updated'),
    errorMessage: t('interests.updateError'),
    isEqual: sameList,
  });
  const [draft, setDraft] = useState('');

  useEffect(() => {
    onEditStateChange?.({ isEditing, count: interests.length });
  }, [isEditing, interests.length, onEditStateChange]);

  const addInterest = () => {
    const v = draft.trim().slice(0, INTEREST_MAX_LEN);
    if (v && interests.length < INTERESTS_MAX && !interests.includes(v)) {
      setInterests([...interests, v]);
    }
    setDraft('');
  };

  const removeInterest = (tag: string) => {
    setInterests(interests.filter((t) => t !== tag));
  };

  const handleCancel = () => {
    cancel();
    setDraft('');
  };

  if (!isEditing) {
    return (
      <div className={styles.view}>
        {saved.length > 0 ? (
          <div className={styles.chips}>
            {saved.map((tag) => (
              <span key={tag} className={styles.chip}>{tag}</span>
            ))}
          </div>
        ) : (
          <p className={styles.placeholder}>{t('interests.empty')}</p>
        )}
        <Button
          variant="ghost"
          size="icon_sm"
          onClick={startEditing}
          aria-label={`${tc('edit')} ${t('interests.label')}`}
          className={styles.editButton}
        >
          <Pencil size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.edit}>
      {interests.length > 0 && (
        <div className={styles.chips}>
          {interests.map((tag) => (
            <button
              key={tag}
              type="button"
              className={styles.editableChip}
              onClick={() => removeInterest(tag)}
            >
              {tag}
              <span className={styles.removeIcon}>✕</span>
            </button>
          ))}
        </div>
      )}
      <div className={styles.addRow}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addInterest();
            }
          }}
          maxLength={INTEREST_MAX_LEN}
          placeholder={t('interests.placeholder')}
          disabled={isSaving || interests.length >= INTERESTS_MAX}
          autoFocus
        />
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
            onClick={handleCancel}
            disabled={isSaving}
            aria-label={tc('cancel')}
            className={styles.actionButton}
          >
            <X size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};
