'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { updateInterests } from '@/entities/user';
import { useEditableField } from '@/shared/lib/useEditableField';
import styles from './EditableInterests.module.css';

const INTERESTS_MAX = 10;
const INTEREST_MAX_LEN = 30;

interface EditableInterestsProps {
  initialInterests: string[];
  userId: string;
}

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export const EditableInterests = ({ initialInterests, userId }: EditableInterestsProps) => {
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
    successMessage: 'Interests updated',
    errorMessage: 'Failed to update interests',
    isEqual: sameList,
  });
  const [draft, setDraft] = useState('');

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
          <p className={styles.placeholder}>Add your interests</p>
        )}
        <Button
          variant="ghost"
          size="icon_sm"
          onClick={startEditing}
          aria-label="Edit interests"
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
          placeholder="Add interest and press Enter"
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
            aria-label="Save"
            className={styles.actionButton}
          >
            <Check size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon_sm"
            onClick={handleCancel}
            disabled={isSaving}
            aria-label="Cancel"
            className={styles.actionButton}
          >
            <X size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};
