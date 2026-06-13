'use client';

import { EditableField } from '@/shared/ui/EditableField';
import { updateAlias } from '@/entities/user';

const ALIAS_MAX = 30;

interface EditableAliasProps {
  initialAlias: string | null;
  userId: string;
}

export const EditableAlias = ({ initialAlias, userId }: EditableAliasProps) => (
  <EditableField
    initial={initialAlias ?? ''}
    onSave={(value) => updateAlias(userId, value)}
    successMessage="Alias updated"
    errorMessage="Failed to update alias"
    label="alias"
    emptyText="Add an alias"
    inputPlaceholder="Alias / character name"
    maxLength={ALIAS_MAX}
  />
);
