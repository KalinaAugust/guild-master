'use client';

import { Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EditableField } from '@/shared/ui/EditableField';
import { ProfileBlock } from '@/shared/ui/ProfileBlock';
import {
  useGetUserNotesQuery,
  useUpdateUserNoteMutation,
  useDeleteUserNoteMutation,
} from '@/entities/user';

interface PrivateNoteBlockProps {
  targetUserId: string;
  initialNote?: string;
}

export const PrivateNoteBlock = ({ targetUserId, initialNote = '' }: PrivateNoteBlockProps) => {
  const t = useTranslations('PrivateNote');
  const { data: notes } = useGetUserNotesQuery();
  const [updateNote] = useUpdateUserNoteMutation();
  const [deleteNote] = useDeleteUserNoteMutation();

  const currentNote = notes 
    ? (notes.find((n) => n.target_user_id === targetUserId)?.note || '')
    : initialNote;

  const handleSave = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      await deleteNote(targetUserId).unwrap();
    } else {
      await updateNote({ targetUserId, note: trimmed }).unwrap();
    }
  };

  return (
    <ProfileBlock icon={Lock} title={t('title')} help={t('helpTooltip')}>
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
    </ProfileBlock>
  );
};
