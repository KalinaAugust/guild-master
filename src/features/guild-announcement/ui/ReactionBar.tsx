'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useToggleReactionMutation, type ReactionSummary, type ReactionType } from '@/entities/announcement';
import styles from './ReactionBar.module.css';

const EMOJI: Record<ReactionType, string> = {
  like: '👍',
  dislike: '👎',
  heart: '❤️',
  doubt: '🤔',
  poop: '💩',
};

interface ReactionBarProps {
  guildId: string;
  announcementId: string;
  reactions: ReactionSummary[];
  canReact: boolean;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({ guildId, announcementId, reactions, canReact }) => {
  const t = useTranslations('Announcements');
  const [toggle] = useToggleReactionMutation();

  const handleClick = async (type: ReactionType) => {
    if (!canReact) return;
    try {
      await toggle({ guildId, announcementId, type }).unwrap();
    } catch {
      toast.error(t('reactError'));
    }
  };

  return (
    <div className={styles.bar}>
      {reactions.map((r) => (
        <Tooltip key={r.type} content={t(`reactions.${r.type}`)}>
          <button
            type="button"
            className={`${styles.reaction} ${r.reacted ? styles.active : ''}`}
            onClick={() => handleClick(r.type)}
            disabled={!canReact}
            aria-pressed={r.reacted}
            aria-label={t(`reactions.${r.type}`)}
          >
            <span className={styles.emoji} aria-hidden="true">{EMOJI[r.type]}</span>
            {r.count > 0 && <span className={styles.count}>{r.count}</span>}
          </button>
        </Tooltip>
      ))}
    </div>
  );
};
