import React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { Guild } from '@/entities/guild';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import styles from './GuildList.module.css';

interface GuildListProps {
  title: string;
  guilds: Guild[];
  emptyMessage: string;
}

export const GuildList: React.FC<GuildListProps> = ({ title, guilds, emptyMessage }) => {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      {guilds.length === 0 ? (
        <p className={styles.empty}>{emptyMessage}</p>
      ) : (
        <ul className={styles.list}>
          {guilds.map((guild) => (
            <li key={guild.id} className={styles.row}>
              <Link href={`/guilds/${guild.id}`} className={styles.rowLink}>
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
