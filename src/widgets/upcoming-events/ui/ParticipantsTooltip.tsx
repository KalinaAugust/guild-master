'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { EventParticipant } from '@/shared/types';
import { resolveDisplayName } from '@/entities/user';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { NameWithIcon } from '@/shared/ui/NameWithIcon';
import styles from './UpcomingEventsStrip.module.css';

interface Props {
  participants: EventParticipant[];
}

export const ParticipantsTooltip: React.FC<Props> = ({ participants }) => {
  const t = useTranslations('UpcomingEvents');
  const confirmed = participants.filter(p => p.status === 'confirmed');
  if (confirmed.length === 0) {
    return <span className={styles.tooltipEmpty}>{t('noConfirmations')}</span>;
  }
  return (
    <div className={styles.participantsList}>
      <div className={styles.tooltipLabel}>{t('confirmedLabel')}</div>
      {confirmed.map(p => {
        const name = resolveDisplayName({ fullName: p.profile.fullName, alias: p.profile.alias, displayAsAlias: p.profile.displayAsAlias });
        return (
          <div key={p.id} className={styles.participantRow}>
            <UserAvatar avatarUrl={p.profile.avatarUrl} name={name} size="sm" />
            <span className={styles.participantName}>
              <NameWithIcon name={name ?? 'Unknown'} icon={p.profile.icon} fallback="Unknown" iconSize={12} />
            </span>
          </div>
        );
      })}
    </div>
  );
};
