'use client';

import { EditableField } from '@/shared/ui/EditableField';
import { updateFullName } from '@/entities/user';

interface EditableNameProps {
  initialFullName: string | null;
  userId: string;
}

export const EditableName = ({ initialFullName, userId }: EditableNameProps) => (
  <EditableField
    initial={initialFullName ?? ''}
    onSave={(value) => updateFullName(userId, value)}
    successMessage="Name updated"
    errorMessage="Failed to update name"
    label="name"
    emptyText="Add your name"
    inputPlaceholder="Your name"
    maxLength={50}
  />
);
