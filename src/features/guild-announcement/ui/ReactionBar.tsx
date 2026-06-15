'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ThumbsUp, ThumbsDown, Heart, PartyPopper, Lightbulb, type LucideIcon } from 'lucide-react';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useToggleReactionMutation, type ReactionSummary, type ReactionType } from '@/entities/announcement';
import styles from './ReactionBar.module.css';

const ICON: Record<ReactionType, LucideIcon> = {
  like: ThumbsUp,
  dislike: ThumbsDown,
  heart: Heart,
  celebrate: PartyPopper,
  insightful: Lightbulb,
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
      {reactions.map((r) => {
        const Icon = ICON[r.type];
        return (
          <Tooltip key={r.type} content={t(`reactions.${r.type}`)}>
            <button
              type="button"
              className={`${styles.reaction} ${r.reacted ? styles.active : ''}`}
              onClick={() => handleClick(r.type)}
              disabled={!canReact}
              aria-pressed={r.reacted}
              aria-label={t(`reactions.${r.type}`)}
            >
              <Icon size={16} className={styles.icon} aria-hidden="true" />
              {r.count > 0 && <span className={styles.count}>{r.count}</span>}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
};
