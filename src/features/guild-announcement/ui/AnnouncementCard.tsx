'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { toast } from 'sonner';
import { Pin, PinOff, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { NameWithIcon } from '@/shared/ui/NameWithIcon';
import { Tooltip } from '@/shared/ui/Tooltip';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Markdown } from '@/shared/ui/Markdown';
import { GradientTitle } from '@/shared/ui/GradientTitle';
import { resolveDisplayName } from '@/entities/user';
import {
  useSetAnnouncementPinnedMutation,
  useDeleteAnnouncementMutation,
  useGetAnnouncementCommentsQuery,
  type Announcement,
  type AnnouncementComment,
} from '@/entities/announcement';
import { ReactionBar } from './ReactionBar';
import { AnnouncementComments } from './AnnouncementComments';
import styles from './AnnouncementCard.module.css';

interface AnnouncementCardProps {
  announcement: Announcement;
  guildId: string;
  userId?: string;
  viewerProfile?: AnnouncementComment['profile'];
  onEdit: (a: Announcement) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement: a,
  guildId,
  userId,
  viewerProfile,
  onEdit,
}) => {
  const t = useTranslations('Announcements');
  const locale = useLocale();
  const [setPinned] = useSetAnnouncementPinnedMutation();
  const [deleteAnnouncement, { isLoading: isDeleting }] = useDeleteAnnouncementMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Keep a live subscription to the comments from the moment the card renders, so
  // they are fetched as soon as the announcements load and stay in cache. Opening
  // the comments tab then reads ready data instead of triggering a loading spinner.
  useGetAnnouncementCommentsQuery({ guildId, announcementId: a.id });

  const authorName = resolveDisplayName({ fullName: a.author.fullName, alias: a.author.alias, displayAsAlias: a.author.displayAsAlias });

  const handlePinToggle = async () => {
    try {
      await setPinned({ guildId, announcementId: a.id, isPinned: !a.isPinned }).unwrap();
    } catch {
      toast.error(t('updateError'));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAnnouncement({ guildId, announcementId: a.id }).unwrap();
    } catch {
      toast.error(t('deleteError'));
    }
  };

  return (
    <article className={`${styles.card} ${a.isPinned ? styles.pinned : ''}`}>
      <header className={styles.head}>
        <ProfileLink publicId={a.author.publicId} aria-label={authorName ?? undefined}>
          <UserAvatar avatarUrl={a.author.avatarUrl} name={authorName} size="md" />
        </ProfileLink>
        <div className={styles.headText}>
          <ProfileLink publicId={a.author.publicId} className={styles.author}>
            <NameWithIcon name={authorName} icon={a.author.icon} iconSize={14} />
          </ProfileLink>
          <span className={styles.time}>
            {dayjs(a.createdAt).locale(locale).format('LLL')}
            {a.updatedAt !== a.createdAt && <span className={styles.edited}> · {t('edited')}</span>}
          </span>
        </div>

        {a.canManage && (
          <div className={styles.actions}>
            <Tooltip content={a.isPinned ? t('unpin') : t('pin')}>
              <button type="button" className={styles.action} onClick={handlePinToggle} aria-label={a.isPinned ? t('unpin') : t('pin')}>
                {a.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
              </button>
            </Tooltip>
            <Tooltip content={t('editLabel')}>
              <button type="button" className={styles.action} onClick={() => onEdit(a)} aria-label={t('editLabel')}>
                <Pencil size={16} />
              </button>
            </Tooltip>
            <Tooltip content={t('deleteLabel')}>
              <button type="button" className={`${styles.action} ${styles.danger}`} onClick={() => setConfirmOpen(true)} aria-label={t('deleteLabel')}>
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        )}
      </header>

      <div className={styles.divider} />

      <div className={styles.titleRow}>
        <GradientTitle as="h3" fontSize="1.15rem" className={styles.title}>
          {a.title}
        </GradientTitle>
        {a.isPinned && (
          <span className={styles.pinnedBadge}>
            <Pin size={12} aria-hidden="true" />
            {t('pinnedBadge')}
          </span>
        )}
      </div>
      <Markdown source={a.content} className={styles.content} />

      <footer className={styles.foot}>
        <ReactionBar guildId={guildId} announcementId={a.id} reactions={a.reactions} canReact={!!userId} />
        <button type="button" className={styles.commentsToggle} onClick={() => setCommentsOpen((v) => !v)}>
          <MessageSquare size={16} />
          {t('commentsCount', { count: a.commentCount })}
        </button>
      </footer>

      {commentsOpen && (
        <AnnouncementComments guildId={guildId} announcementId={a.id} userId={userId} viewerProfile={viewerProfile} />
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t('confirmDelete')}
        confirmLabel={t('deleteLabel')}
        isLoading={isDeleting}
      />
    </article>
  );
};
