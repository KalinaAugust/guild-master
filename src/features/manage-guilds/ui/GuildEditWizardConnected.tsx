'use client';

import React from 'react';
import { useAppSelector, useAppDispatch } from '@/shared/lib/hooks';
import { closeGuildEditModal } from '@/entities/guild';
import { EditGuildWizard } from './EditGuildWizard';

interface Props {
  userId: string;
}

export const GuildEditWizardConnected: React.FC<Props> = ({ userId }) => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.guild.isGuildEditModalOpen);
  const editingGuild = useAppSelector((state) => state.guild.editingGuild);

  return (
    <EditGuildWizard
      key={editingGuild?.id ?? 'edit'}
      open={isOpen}
      guild={editingGuild}
      onClose={() => dispatch(closeGuildEditModal())}
      userId={userId}
    />
  );
};
