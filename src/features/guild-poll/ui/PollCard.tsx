'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, Lock, Plus } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import {
  useVotePollMutation,
  useClosePollMutation,
  useDeletePollMutation,
  type Poll,
} from '@/entities/poll';
import styles from './PollCard.module.css';

interface PollCardProps {
  poll: Poll;
  guildId: string;
}

/** Rounds a percentage to the nearest 5 to select a static fill-width class. */
const fillClass = (pct: number) => styles[`fill${Math.round(pct / 5) * 5}`];

export const PollCard: React.FC<PollCardProps> = ({ poll, guildId }) => {
  const t = useTranslations('GuildPoll');
  const [vote, { isLoading: isVoting }] = useVotePollMutation();
  const [closePoll, { isLoading: isClosing }] = useClosePollMutation();
  const [deletePoll, { isLoading: isDeleting }] = useDeletePollMutation();
  const [customBody, setCustomBody] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const closed = !!poll.closedAt;

  const handleVote = async (optionId: string) => {
    if (closed) return;
    try {
      await vote({ guildId, pollId: poll.id, vote: { optionId } }).unwrap();
    } catch {
      toast.error(t('voteError'));
    }
  };

  const handleAddCustom = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const body = customBody.trim();
    if (!body || isVoting) return;
    try {
      await vote({ guildId, pollId: poll.id, vote: { customBody: body } }).unwrap();
      setCustomBody('');
    } catch {
      toast.error(t('voteError'));
    }
  };

  const handleClose = async () => {
    try {
      await closePoll({ guildId, pollId: poll.id }).unwrap();
    } catch {
      toast.error(t('closeError'));
    }
  };

  const handleDelete = async () => {
    try {
      await deletePoll({ guildId, pollId: poll.id }).unwrap();
    } catch {
      toast.error(t('deleteError'));
    }
  };

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        {closed && (
          <div className={styles.badges}>
            <span className={styles.closedBadge}>
              <Lock size={12} aria-hidden="true" />
              {t('closedBadge')}
            </span>
          </div>
        )}
        <h3 className={styles.question}>{poll.title}</h3>
        {poll.description && <p className={styles.description}>{poll.description}</p>}
      </header>

      <ul className={styles.options}>
        {poll.options.map((o) => {
          const pct = poll.totalVotes > 0 ? (o.voteCount / poll.totalVotes) * 100 : 0;
          const voted = poll.myVoteOptionIds.includes(o.id);
          return (
            <li key={o.id} className={styles.optionItem}>
              <button
                type="button"
                className={`${styles.option} ${voted ? styles.optionVoted : ''}`}
                onClick={() => handleVote(o.id)}
                disabled={closed}
              >
                <span className={`${styles.optionFill} ${fillClass(pct)}`} aria-hidden="true" />
                <span className={styles.optionCheck}>{voted && <Check size={14} />}</span>
                <span className={styles.optionLabel}>{o.body}</span>
                <span className={styles.optionPercent}>{Math.round(pct)}%</span>
              </button>
            </li>
          );
        })}
      </ul>

      {poll.allowCustom && !closed && (
        <form className={styles.customForm} onSubmit={handleAddCustom}>
          <Input
            type="text"
            value={customBody}
            onChange={(e) => setCustomBody(e.target.value)}
            placeholder={t('addCustomPlaceholder')}
            className={styles.customInput}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={!customBody.trim() || isVoting}>
            <Plus size={16} />
          </Button>
        </form>
      )}

      <footer className={styles.foot}>
        <span className={styles.totals}>{t('votesCount', { count: poll.totalVotes })}</span>
        {poll.canManage && (
          <div className={styles.actions}>
            {!closed && (
              <button type="button" className={styles.action} onClick={handleClose} disabled={isClosing}>
                {t('closeLabel')}
              </button>
            )}
            <button
              type="button"
              className={`${styles.action} ${styles.danger}`}
              onClick={() => setConfirmOpen(true)}
            >
              {t('deleteLabel')}
            </button>
          </div>
        )}
      </footer>

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
