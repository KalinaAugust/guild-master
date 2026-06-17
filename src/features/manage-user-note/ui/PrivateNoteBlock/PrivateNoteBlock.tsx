'use client';

import { Lock, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EditableField } from '@/shared/ui/EditableField';
import { Tooltip } from '@/shared/ui/Tooltip';
import {
  useGetUserNotesQuery,
  useUpdateUserNoteMutation,
  useDeleteUserNoteMutation,
} from '@/entities/user';
import styles from './PrivateNoteBlock.module.css';

interface PrivateNoteBlockProps {
  targetUserId: string;
}

export const PrivateNoteBlock = ({ targetUserId }: PrivateNoteBlockProps) => {
  const t = useTranslations('PrivateNote');
  const { data: notes, isLoading } = useGetUserNotesQuery();
  const [updateNote] = useUpdateUserNoteMutation();
  const [deleteNote] = useDeleteUserNoteMutation();

  const currentNote = notes?.find((n) => n.target_user_id === targetUserId)?.note || '';

  const handleSave = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      await deleteNote(targetUserId).unwrap();
    } else {
      await updateNote({ targetUserId, note: trimmed }).unwrap();
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <section className={styles.block}>
      <div className={styles.blockHeader}>
        <span className={styles.blockIconTile}>
          <Lock size={16} className={styles.blockIcon} />
        </span>
        <h2 className={styles.blockTitle}>{t('title')}</h2>
        <Tooltip content={t('helpTooltip')}>
          <button type="button" className={styles.helpButton} aria-label={t('helpTooltip')}>
            <HelpCircle size={14} className={styles.helpIcon} />
          </button>
        </Tooltip>
      </div>
      <EditableField
        initial={currentNote}
        onSave={handleSave}
        successMessage={t('successMessage')}
        errorMessage={t('errorMessage')}
        label="note"
        emptyText={t('emptyText')}
        inputPlaceholder={t('inputPlaceholder')}
        maxLength={2000}
        multiline
        rows={4}
      />
    </section>
  );
};
