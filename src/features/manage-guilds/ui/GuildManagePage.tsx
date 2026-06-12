'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { useGetGuildsQuery } from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import { Spinner } from '@/shared/ui/Spinner';
import { GradientTitle } from '@/shared/ui/GradientTitle';
import { GuildList } from './GuildList';
import { EditGuildWizard } from './EditGuildWizard';
import styles from './GuildManagePage.module.css';

interface GuildManagePageProps {
  userId: string;
}

export const GuildManagePage: React.FC<GuildManagePageProps> = ({ userId }) => {
  const t = useTranslations('Guild');

  const [wizardOpen, setWizardOpen] = useState(false);

  const { data: guilds = [], isLoading } = useGetGuildsQuery();

  const owned = guilds.filter((g) => g.ownerId === userId);
  const member = guilds.filter((g) => g.ownerId !== userId);

  const openCreate = () => setWizardOpen(true);
  const closeWizard = () => setWizardOpen(false);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <GradientTitle className={styles.pageTitle}>{t('manageTitle')}</GradientTitle>
        <Button variant="primary" onClick={openCreate} className={styles.createBtn}>
          <Plus size={18} strokeWidth={3} />
          {t('createButton')}
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.loader}>
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <GuildList
            title={t('ownerSection')}
            guilds={owned}
            emptyMessage={t('emptyOwned')}
          />

          <GuildList
            title={t('memberSection')}
            guilds={member}
            emptyMessage={t('emptyMember')}
          />
        </>
      )}

      <EditGuildWizard open={wizardOpen} guild={null} onClose={closeWizard} userId={userId} />
    </div>
  );
};
