'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { updateFullName } from '@/entities/user/api/updateFullName';
import styles from './EditableName.module.css';

interface EditableNameProps {
  initialFullName: string | null;
  userId: string;
}

export const EditableName = ({ initialFullName, userId }: EditableNameProps) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialFullName ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const trimmed = value.trim();
  const isUnchanged = trimmed === (initialFullName ?? '').trim();

  const handleCancel = () => {
    setValue(initialFullName ?? '');
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateFullName(userId, trimmed);
      toast.success('Name updated');
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className={styles.view}>
        <span className={initialFullName ? styles.name : styles.placeholder}>
          {initialFullName || 'Add your name'}
        </span>
        <Button
          variant="ghost"
          size="icon_sm"
          onClick={() => setIsEditing(true)}
          aria-label="Edit name"
          className={styles.editButton}
        >
          <Pencil size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.edit}>
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={50}
        placeholder="Your name"
        autoFocus
        disabled={isSaving}
      />
      <div className={styles.actions}>
        <Button size="sm" onClick={handleSave} isLoading={isSaving} disabled={isUnchanged}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
