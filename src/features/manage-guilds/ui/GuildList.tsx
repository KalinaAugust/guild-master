'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Shield, Users } from 'lucide-react';
import { Guild } from '@/entities/guild';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { CopyLinkButton } from '@/shared/ui/CopyLinkButton';
import styles from './GuildList.module.css';

interface GuildListProps {
  title: string;
  guilds: Guild[];
  emptyMessage: string;
}

export const GuildList: React.FC<GuildListProps> = ({ title, guilds, emptyMessage }) => {
  const t = useTranslations('Guild');
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      {guilds.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <ul className={styles.list}>
          {guilds.map((guild) => (
            <li key={guild.id} className={styles.row}>
              <Link href={`/guilds/${guild.publicId ?? guild.id}`} className={styles.rowLink}>
                {guild.avatarUrl ? (
                  <UserAvatar avatarUrl={guild.avatarUrl} name={guild.name} size="lg" />
                ) : (
                  <span className={styles.iconWrap}>
                    <Shield size={28} className={styles.icon} />
                  </span>
                )}
                <div className={styles.info}>
                  <span className={styles.name}>{guild.name}</span>
                  {guild.description && (
                    <span className={styles.description}>{guild.description}</span>
                  )}
                </div>
                <div className={styles.meta}>
                  {!!guild.pendingRequestCount && (
                    <span
                      className={styles.pendingBadge}
                      aria-label={t('pendingRequestsAria', { count: guild.pendingRequestCount })}
                      title={t('pendingRequestsAria', { count: guild.pendingRequestCount })}
                    >
                      +{guild.pendingRequestCount}
                    </span>
                  )}
                  {typeof guild.memberCount === 'number' && (
                    <span
                      className={styles.memberCount}
                      aria-label={t('membersAria', { count: guild.memberCount })}
                    >
                      <Users size={15} />
                      {guild.memberCount}
                    </span>
                  )}
                </div>
              </Link>
              <div className={styles.actions}>
                <CopyLinkButton 
                  link={`${typeof window !== 'undefined' ? window.location.origin : ''}/guilds/${guild.publicId ?? guild.id}`}
                  className={styles.copyBtn}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
