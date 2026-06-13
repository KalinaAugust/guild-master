'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UseEditableFieldOptions<T> {
  /** Committed value coming from the server. */
  initial: T;
  /** Persists the value; receives the normalized value. */
  onSave: (value: T) => Promise<void>;
  successMessage: string;
  errorMessage: string;
  /** Applied to the draft before comparing and saving (e.g. trim). */
  normalize?: (value: T) => T;
  /** Custom equality for the "unchanged" check (e.g. list comparison). */
  isEqual?: (a: T, b: T) => boolean;
}

/**
 * Shared edit/view state machine for inline-editable profile fields.
 * Keeps a local `saved` copy so the committed value shows instantly after
 * saving, while `router.refresh()` syncs the server in the background.
 */
export const useEditableField = <T>({
  initial,
  onSave,
  successMessage,
  errorMessage,
  normalize = (v) => v,
  isEqual = Object.is,
}: UseEditableFieldOptions<T>) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);

  const isUnchanged = isEqual(normalize(value), saved);

  const startEditing = () => setIsEditing(true);

  const cancel = () => {
    setValue(saved);
    setIsEditing(false);
  };

  const save = async () => {
    const next = normalize(value);
    setIsSaving(true);
    try {
      await onSave(next);
      setSaved(next);
      toast.success(successMessage);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error(errorMessage, error);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return { isEditing, value, setValue, saved, isSaving, isUnchanged, startEditing, cancel, save };
};
