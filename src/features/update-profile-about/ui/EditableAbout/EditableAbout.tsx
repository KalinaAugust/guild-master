'use client';

import { EditableField } from '@/shared/ui/EditableField';
import { updateAbout } from '@/entities/user';

const ABOUT_MAX = 500;

interface EditableAboutProps {
  initialAbout: string | null;
  userId: string;
}

export const EditableAbout = ({ initialAbout, userId }: EditableAboutProps) => (
  <EditableField
    initial={initialAbout ?? ''}
    onSave={(value) => updateAbout(userId, value)}
    successMessage="About updated"
    errorMessage="Failed to update about"
    label="about"
    emptyText="Add something about yourself"
    inputPlaceholder="A few words about yourself"
    maxLength={ABOUT_MAX}
    multiline
    rows={3}
  />
);
