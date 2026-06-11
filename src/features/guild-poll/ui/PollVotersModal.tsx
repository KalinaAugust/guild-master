'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Modal } from '@/shared/ui/Modal';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import dayjs from '@/shared/lib/dayjs';
import type { Poll } from '@/entities/poll';
import { resolveDisplayName } from '@/entities/user';
import styles from './PollVotersModal.module.css';

interface PollVotersModalProps {
  poll: Poll;
  isOpen: boolean;
  onClose: () => void;
}

export const PollVotersModal: React.FC<PollVotersModalProps> = ({ poll, isOpen, onClose }) => {
  const t = useTranslations('GuildPoll');
  const locale = useLocale();

  const formatVotedAt = (iso: string) => {
    const date = dayjs(iso).locale(locale);
    const time = date.format('HH:mm');
    return date.isSame(dayjs(), 'day') ? `${t('today')} ${time}` : `${date.format('D MMM')} ${time}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('votersTitle')} className={styles.modal}>
      <div className={styles.options}>
        {poll.options.map((o) => {
          const pct = poll.totalVotes > 0 ? Math.round((o.voteCount / poll.totalVotes) * 100) : 0;
          return (
            <section key={o.id} className={styles.option}>
              <header className={styles.optionHead}>
                <span className={styles.optionTitle}>
                  {o.body} — {pct}%
                </span>
                <span className={styles.optionCount}>{t('votesCount', { count: o.voteCount })}</span>
              </header>
              {o.voters.length > 0 && (
                <ul className={styles.voters}>
                  {o.voters.map((v, i) => {
                    const voterName = resolveDisplayName({
                      fullName: v.fullName,
                      alias: v.alias,
                      displayAsAlias: v.displayAsAlias,
                    });
                    return (
                      <li key={i} className={styles.voter}>
                        <ProfileLink publicId={v.publicId} aria-label={voterName ?? undefined}>
                          <UserAvatar avatarUrl={v.avatarUrl} name={voterName} size="md" />
                        </ProfileLink>
                        <ProfileLink publicId={v.publicId} className={styles.voterName}>
                          {voterName ?? t('unknownVoter')}
                        </ProfileLink>
                        <span className={styles.voterTime}>{formatVotedAt(v.votedAt)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Modal>
  );
};
