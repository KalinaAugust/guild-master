'use client';

import { useTranslations } from 'next-intl';
import { EditableField } from '@/shared/ui/EditableField';
import { updateFullName } from '@/entities/user';

interface EditableNameProps {
  initialFullName: string | null;
  userId: string;
}

export const EditableName = ({ initialFullName, userId }: EditableNameProps) => {
  const t = useTranslations('UpdateProfile');
  return (
    <EditableField
      initial={initialFullName ?? ''}
      onSave={(value) => updateFullName(userId, value)}
      successMessage={t('name.updated')}
      errorMessage={t('name.updateError')}
      label={t('name.label')}
      emptyText={t('name.empty')}
      inputPlaceholder={t('name.placeholder')}
      maxLength={50}
    />
  );
};
