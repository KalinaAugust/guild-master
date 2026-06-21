'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { Panel } from '@/shared/ui/Panel';
import { Button } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import { AnnouncementCard, AnnouncementModal } from '@/features/guild-announcement';
import { PollCard, PollWizard } from '@/features/guild-poll';
import { useGetGuildPollsQuery } from '@/entities/poll';
import {
  useGetGuildAnnouncementsQuery,
  useMarkAnnouncementsReadMutation,
  type Announcement,
  type AnnouncementComment,
} from '@/entities/announcement';
import type { Guild } from '@/entities/guild';
import { useGuildPermissions } from '@/entities/guild';
import { AnnouncementsSkeleton, PollsSkeleton } from './AnnouncementsSkeleton';
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
  const pollT = useTranslations('GuildPoll');
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds, initialGuildId, userId);
  const { canCreatePolls } = useGuildPermissions(activeGuildId ?? '', userId);

  const { data, isLoading } = useGetGuildAnnouncementsQuery(activeGuildId ?? '', { skip: !activeGuildId });
  const announcements = data?.announcements ?? [];
  const canCreate = data?.canCreate ?? false;

  const { data: polls = [], isLoading: isPollsLoading } = useGetGuildPollsQuery(activeGuildId ?? '', {
    skip: !activeGuildId,
  });

  // Opening the feed clears the sidebar unread dot for the active guild.
  const [markRead] = useMarkAnnouncementsReadMutation();
  useEffect(() => {
    if (activeGuildId) markRead(activeGuildId);
  }, [activeGuildId, markRead]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; title: string; content: string } | null>(null);
  const [isPollWizardOpen, setIsPollWizardOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (a: Announcement) => {
    setEditing({ id: a.id, title: a.title, content: a.content });
    setModalOpen(true);
  };

  return (
    <Panel className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerFeed}>
          <div className={styles.guildSelect}>
            <GuildSelect value={activeGuildId ?? ''} onValueChange={handleGuildChange} options={guildOptions} />
          </div>
          {canCreate && (
            <Tooltip content={t('newAnnouncement')}>
              <Button
                type="button"
                variant="primary"
                className={styles.newButton}
                onClick={openCreate}
                aria-label={t('newAnnouncement')}
              >
                <Plus size={18} strokeWidth={3} />
              </Button>
            </Tooltip>
          )}
        </div>
        <div className={styles.headerPolls}>
          {canCreatePolls && (
            <Tooltip content={pollT('newPoll')}>
              <Button
                type="button"
                variant="primary"
                className={styles.newPollButton}
                onClick={() => setIsPollWizardOpen(true)}
                aria-label={pollT('newPoll')}
              >
                <Plus size={18} strokeWidth={3} />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      <div className={styles.body}>
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

        <aside className={styles.polls}>
          {activeGuildId && isPollsLoading && <PollsSkeleton />}
          {activeGuildId && !isPollsLoading && polls.length === 0 && (
            <p className={styles.empty}>{pollT('emptyPolls')}</p>
          )}
          {activeGuildId &&
            !isPollsLoading &&
            polls.map((poll) => <PollCard key={poll.id} poll={poll} guildId={activeGuildId} />)}
        </aside>
      </div>

      {activeGuildId && (
        <AnnouncementModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          guildId={activeGuildId}
          editing={editing}
        />
      )}
      {activeGuildId && (
        <PollWizard
          open={isPollWizardOpen}
          onClose={() => setIsPollWizardOpen(false)}
          guildId={activeGuildId}
        />
      )}
    </Panel>
  );
};
