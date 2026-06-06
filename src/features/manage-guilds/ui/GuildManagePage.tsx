'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { useGetGuildsQuery, Guild } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import { GuildList } from './GuildList';
import { EditGuildWizard } from './EditGuildWizard';
import styles from './GuildManagePage.module.css';

interface GuildManagePageProps {
  userId: string;
}

export const GuildManagePage: React.FC<GuildManagePageProps> = ({ userId }) => {
  const t = useTranslations('Guild');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingGuild, setEditingGuild] = useState<Guild | null>(null);

  const { data: guilds = [] } = useGetGuildsQuery();

  const owned = guilds.filter((g) => g.ownerId === userId);
  const member = guilds.filter((g) => g.ownerId !== userId);

  const openCreate = () => { setEditingGuild(null); setWizardOpen(true); };
  const openEdit = (guild: Guild) => { setEditingGuild(guild); setWizardOpen(true); };
  const closeWizard = () => { setWizardOpen(false); setEditingGuild(null); };

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
        emptyMessage={t('emptyOwned')}
      />

      <GuildList
        title={t('memberSection')}
        guilds={member}
        emptyMessage={t('emptyMember')}
      />

      <EditGuildWizard key={editingGuild?.id ?? 'new'} open={wizardOpen} guild={editingGuild} onClose={closeWizard} userId={userId} />
    </div>
  );
};
