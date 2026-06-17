'use client';

import { useTranslations } from 'next-intl';
import { EditableField } from '@/shared/ui/EditableField';
import { updateAlias } from '@/entities/user';

const ALIAS_MAX = 30;

interface EditableAliasProps {
  initialAlias: string | null;
  userId: string;
}

export const EditableAlias = ({ initialAlias, userId }: EditableAliasProps) => {
  const t = useTranslations('UpdateProfile');
  return (
    <EditableField
      initial={initialAlias ?? ''}
      onSave={(value) => updateAlias(userId, value)}
      successMessage={t('alias.updated')}
      errorMessage={t('alias.updateError')}
      label={t('alias.label')}
      emptyText={t('alias.empty')}
      inputPlaceholder={t('alias.placeholder')}
      maxLength={ALIAS_MAX}
    />
  );
};
