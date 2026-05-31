'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Pencil, Trash2 } from 'lucide-react';
import { Guild } from '@/entities/guild';
import styles from './GuildList.module.css';

interface GuildListProps {
  title: string;
  guilds: Guild[];
  onEdit?: (guild: Guild) => void;
  onDelete?: (guild: Guild) => void;
  emptyMessage: string;
}

export const GuildList: React.FC<GuildListProps> = ({ title, guilds, onEdit, onDelete, emptyMessage }) => {
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
              <Shield size={18} className={styles.icon} />
              <div className={styles.info}>
                <span className={styles.name}>{guild.name}</span>
                {guild.description && (
                  <span className={styles.description}>{guild.description}</span>
                )}
              </div>
              {(onEdit || onDelete) && (
                <div className={styles.actions}>
                  {onEdit && (
                    <button
                      className={styles.actionBtn}
                      aria-label={t('editLabel')}
                      onClick={() => onEdit(guild)}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className={styles.actionBtn}
                      aria-label={t('deleteLabel')}
                      onClick={() => onDelete(guild)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
