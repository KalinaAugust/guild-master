'use client';

import { useTranslations } from 'next-intl';
import { EditableField } from '@/shared/ui/EditableField';
import { updateAbout } from '@/entities/user';

const ABOUT_MAX = 500;

interface EditableAboutProps {
  initialAbout: string | null;
  userId: string;
}

export const EditableAbout = ({ initialAbout, userId }: EditableAboutProps) => {
  const t = useTranslations('UpdateProfile');
  return (
    <EditableField
      initial={initialAbout ?? ''}
      onSave={(value) => updateAbout(userId, value)}
      successMessage={t('about.updated')}
      errorMessage={t('about.updateError')}
      label={t('about.label')}
      emptyText={t('about.empty')}
      inputPlaceholder={t('about.placeholder')}
      maxLength={ABOUT_MAX}
      multiline
      rows={3}
    />
  );
};
