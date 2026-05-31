'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useGetGuildsQuery, useDeleteGuildMutation, Guild } from '@/entities/guild';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Button } from '@/shared/ui/Button';
import { GuildList } from './GuildList';
import { EditGuildWizard } from './EditGuildWizard';
import styles from './GuildManagePage.module.css';

interface GuildManagePageProps {
  userId: string;
}

export const GuildManagePage: React.FC<GuildManagePageProps> = ({ userId }) => {
  const t = useTranslations('Guild');
  const commonT = useTranslations('Common');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingGuild, setEditingGuild] = useState<Guild | null>(null);
  const [deletingGuild, setDeletingGuild] = useState<Guild | null>(null);

  const { data: guilds = [] } = useGetGuildsQuery();
  const [deleteGuild] = useDeleteGuildMutation();

  const owned = guilds.filter((g) => g.ownerId === userId);
  const member = guilds.filter((g) => g.ownerId !== userId);

  const openCreate = () => { setEditingGuild(null); setWizardOpen(true); };
  const openEdit = (guild: Guild) => { setEditingGuild(guild); setWizardOpen(true); };
  const closeWizard = () => { setWizardOpen(false); setEditingGuild(null); };

  const handleDelete = async () => {
    if (!deletingGuild) return;
    try {
      await deleteGuild(deletingGuild.id).unwrap();
      toast.success(t('deleteSuccess'));
    } catch {
      toast.error(t('errorCreate'));
    }
    setDeletingGuild(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>{t('manageTitle')}</h1>
        <Button variant="primary" onClick={openCreate} className={styles.createBtn}>
          <Plus size={18} strokeWidth={3} />
          {t('createButton')}
        </Button>
      </div>

      <GuildList
        title={t('ownerSection')}
        guilds={owned}
        onEdit={openEdit}
        onDelete={setDeletingGuild}
        emptyMessage={t('emptyOwned')}
      />

      <GuildList
        title={t('memberSection')}
        guilds={member}
        emptyMessage={t('emptyMember')}
      />

      <EditGuildWizard key={editingGuild?.id ?? 'new'} open={wizardOpen} guild={editingGuild} onClose={closeWizard} userId={userId} />
      <ConfirmModal
        isOpen={!!deletingGuild}
        onClose={() => setDeletingGuild(null)}
        onConfirm={handleDelete}
        title={commonT('delete')}
        description={t('deleteConfirm')}
        confirmLabel={commonT('delete')}
        variant="danger"
      />
    </div>
  );
};
