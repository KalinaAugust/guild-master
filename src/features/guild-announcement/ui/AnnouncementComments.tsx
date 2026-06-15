'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dayjs from '@/shared/lib/dayjs';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { MessageComposer } from '@/shared/ui/MessageComposer';
import { resolveDisplayName } from '@/entities/user';
import {
  useGetAnnouncementCommentsQuery,
  useAddAnnouncementCommentMutation,
  useDeleteAnnouncementCommentMutation,
  type AnnouncementComment,
} from '@/entities/announcement';
import styles from './AnnouncementComments.module.css';

interface AnnouncementCommentsProps {
  guildId: string;
  announcementId: string;
  userId?: string;
  viewerProfile?: AnnouncementComment['profile'];
}

export const AnnouncementComments: React.FC<AnnouncementCommentsProps> = ({
  guildId,
  announcementId,
  userId,
  viewerProfile,
}) => {
  const t = useTranslations('Announcements');
  const locale = useLocale();
  const { data: comments = [], isLoading } = useGetAnnouncementCommentsQuery({ guildId, announcementId });
  const [addComment, { isLoading: isAdding }] = useAddAnnouncementCommentMutation();
  const [deleteComment] = useDeleteAnnouncementCommentMutation();

  const handleSubmit = async (body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await addComment({
        guildId,
        announcementId,
        body: trimmed,
        author: userId && viewerProfile ? { userId, profile: viewerProfile } : undefined,
      }).unwrap();
    } catch {
      toast.error(t('commentError'));
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment({ guildId, announcementId, commentId }).unwrap();
    } catch {
      toast.error(t('commentDeleteError'));
    }
  };

  return (
    <div className={styles.wrap}>
      <ul className={styles.list}>
        {isLoading && <li className={styles.muted}>…</li>}
        {!isLoading &&
          comments.map((c) => (
            <li key={c.id} className={styles.row}>
              <ProfileLink publicId={c.profile.publicId} aria-label={resolveDisplayName({ fullName: c.profile.fullName, alias: c.profile.alias, displayAsAlias: c.profile.displayAsAlias }) ?? undefined}>
                <UserAvatar avatarUrl={c.profile.avatarUrl} name={resolveDisplayName({ fullName: c.profile.fullName, alias: c.profile.alias, displayAsAlias: c.profile.displayAsAlias })} size="sm" />
              </ProfileLink>
              <div className={styles.bubble}>
                <div className={styles.meta}>
                  <ProfileLink publicId={c.profile.publicId} className={styles.author}>
                    {resolveDisplayName({ fullName: c.profile.fullName, alias: c.profile.alias, displayAsAlias: c.profile.displayAsAlias })}
                  </ProfileLink>
                  <span className={styles.time}>{dayjs(c.createdAt).locale(locale).fromNow()}</span>
                  {c.canDelete && !c.id.startsWith('temp-') && (
                    <button
                      type="button"
                      className={styles.delete}
                      onClick={() => handleDelete(c.id)}
                      aria-label={t('deleteComment')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className={styles.body}>{c.body}</p>
              </div>
            </li>
          ))}
      </ul>

      <MessageComposer
        canWrite={!!userId}
        onSubmit={handleSubmit}
        isSubmitting={isAdding}
        placeholder={t('commentPlaceholder')}
        sendLabel={t('sendComment')}
        lockedPrompt={t('lockedPrompt')}
        maxLength={2000}
      />
    </div>
  );
};
