'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Panel } from '@/shared/ui/Panel';
import { Button } from '@/shared/ui/Button';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import { AnnouncementCard, AnnouncementModal } from '@/features/guild-announcement';
import {
  useGetGuildAnnouncementsQuery,
  type Announcement,
  type AnnouncementComment,
} from '@/entities/announcement';
import type { Guild } from '@/entities/guild';
import { AnnouncementsSkeleton } from './AnnouncementsSkeleton';
import styles from './GuildAnnouncements.module.css';

interface GuildAnnouncementsProps {
  guilds: Guild[];
  userId?: string;
  viewerProfile?: AnnouncementComment['profile'];
  initialGuildId?: string;
}

export const GuildAnnouncements: React.FC<GuildAnnouncementsProps> = ({
  guilds,
  userId,
  viewerProfile,
  initialGuildId,
}) => {
  const t = useTranslations('Announcements');
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds, initialGuildId, userId);

  const { data, isLoading } = useGetGuildAnnouncementsQuery(activeGuildId ?? '', { skip: !activeGuildId });
  const announcements = data?.announcements ?? [];
  const canCreate = data?.canCreate ?? false;

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string; content: string } | null>(null);

  const openCreate = () => {
    setEditing(null);
    setWizardOpen(true);
  };
  const openEdit = (a: Announcement) => {
    setEditing({ id: a.id, title: a.title, content: a.content });
    setWizardOpen(true);
  };

  return (
    <Panel className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.guildSelect}>
          <GuildSelect value={activeGuildId ?? ''} onValueChange={handleGuildChange} options={guildOptions} />
        </div>
        {canCreate && (
          <Button type="button" variant="primary" className={styles.newButton} onClick={openCreate}>
            <Plus size={16} />
            {t('newAnnouncement')}
          </Button>
        )}
      </div>

      <div className={styles.feed}>
        {isLoading && <AnnouncementsSkeleton />}
        {!isLoading && announcements.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
        {!isLoading &&
          announcements.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              guildId={activeGuildId!}
              userId={userId}
              viewerProfile={viewerProfile}
              onEdit={openEdit}
            />
          ))}
      </div>

      {activeGuildId && (
        <AnnouncementModal
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          guildId={activeGuildId}
          editing={editing}
        />
      )}
    </Panel>
  );
};
