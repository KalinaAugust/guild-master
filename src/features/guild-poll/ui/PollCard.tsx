'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, Eye, Lock, Plus, SquareStop, Trash2 } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { PollVotersModal } from './PollVotersModal';
import {
  useVotePollMutation,
  useSetPollVotesMutation,
  useAddPollOptionMutation,
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
  const [setVotes, { isLoading: isSetting }] = useSetPollVotesMutation();
  const [addOption, { isLoading: isAddingOption }] = useAddPollOptionMutation();
  const [closePoll, { isLoading: isClosing }] = useClosePollMutation();
  const [deletePoll, { isLoading: isDeleting }] = useDeletePollMutation();
  const [customBody, setCustomBody] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [votersOpen, setVotersOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const closed = !!poll.closedAt;
  const hasVoted = poll.myVoteOptionIds.length > 0;
  // Revote polls use the explicit "Vote" button (select, then confirm). Everything
  // else votes instantly on click.
  const deferred = poll.allowRevote;

  // Whether the given option is locked for the user:
  // - closed poll → everything locked;
  // - revote → poll locks after voting (cleared via the "Voted" button);
  // - single-choice instant → locks after the first vote;
  // - multiple-choice instant → each cast vote locks on its own, so you can keep
  //   adding options but can no longer un-cast an existing vote.
  const isOptionLocked = (voted: boolean) => {
    if (closed) return true;
    if (deferred || !poll.allowMultiple) return hasVoted;
    return voted;
  };

  const handleOptionClick = (optionId: string, voted: boolean) => {
    if (isOptionLocked(voted)) return;
    if (deferred) {
      toggleSelect(optionId);
    } else {
      void voteImmediate(optionId);
    }
  };

  const toggleSelect = (optionId: string) => {
    setSelected((prev) => {
      if (poll.allowMultiple) {
        return prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId];
      }
      return prev.includes(optionId) ? [] : [optionId];
    });
  };

  /** Instant single-option toggle vote for non-deferred polls. */
  const voteImmediate = async (optionId: string) => {
    if (closed || isVoting) return;
    try {
      await vote({ guildId, pollId: poll.id, vote: { optionId } }).unwrap();
    } catch {
      toast.error(t('voteError'));
    }
  };

  /** Submits the entire selection (or clears it) in a single request. */
  const submitVotes = async (optionIds: string[]) => {
    if (closed || isSetting) return;
    try {
      await setVotes({ guildId, pollId: poll.id, optionIds }).unwrap();
      // Drop only what we submitted; keep anything the user picked while the
      // request was in flight (e.g. choosing a new option right after Revote).
      setSelected((prev) => prev.filter((id) => !optionIds.includes(id)));
    } catch {
      toast.error(t('voteError'));
    }
  };

  const handleSubmit = () => {
    if (hasVoted || selected.length === 0) return;
    void submitVotes(selected);
  };

  // Re-voting clears all of the user's votes at once, re-opening the poll.
  const handleRevote = () => {
    if (!poll.allowRevote || !hasVoted) return;
    void submitVotes([]);
  };

  const handleAddCustom = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const body = customBody.trim();
    if (!body || isVoting || isAddingOption) return;
    try {
      if (deferred) {
        // Add the option to the poll and pre-select it; the actual vote is sent
        // later via the "Vote" button, together with any other selection.
        const { optionId } = await addOption({ guildId, pollId: poll.id, body }).unwrap();
        setSelected((prev) => (poll.allowMultiple ? [...prev, optionId] : [optionId]));
      } else {
        await vote({ guildId, pollId: poll.id, vote: { customBody: body } }).unwrap();
      }
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
        <h3 className={styles.question}>
          {poll.title}
          {poll.isAnonymous && <span className={styles.anonNote}> {t('anonymousNote')}</span>}
        </h3>
        {poll.description && <p className={styles.description}>{poll.description}</p>}
      </header>

      <ul className={styles.options}>
        {poll.options.map((o) => {
          const pct = poll.totalVotes > 0 ? (o.voteCount / poll.totalVotes) * 100 : 0;
          const voted = hasVoted ? poll.myVoteOptionIds.includes(o.id) : selected.includes(o.id);
          return (
            <li key={o.id} className={styles.optionItem}>
              <button
                type="button"
                className={`${styles.option} ${voted ? styles.optionVoted : ''}`}
                onClick={() => handleOptionClick(o.id, voted)}
                disabled={isOptionLocked(voted)}
              >
                <span className={`${styles.optionFill} ${fillClass(pct)}`} aria-hidden="true" />
                <span
                  className={`${styles.control} ${poll.allowMultiple ? styles.checkbox : styles.radio} ${
                    voted ? styles.controlChecked : ''
                  }`}
                  aria-hidden="true"
                >
                  {voted && <Check size={12} strokeWidth={3} />}
                </span>
                <span className={styles.optionLabel}>{o.body}</span>
                <span className={styles.optionPercent}>{Math.round(pct)}%</span>
              </button>
            </li>
          );
        })}
      </ul>

      {poll.allowCustom && !closed && (!hasVoted || (!deferred && poll.allowMultiple)) && (
        <form className={styles.customForm} onSubmit={handleAddCustom}>
          <Input
            type="text"
            value={customBody}
            onChange={(e) => setCustomBody(e.target.value)}
            placeholder={t('addCustomPlaceholder')}
            className={styles.customInput}
          />
          <Button type="submit" variant="secondary" size="sm" className={styles.customSubmit} isLoading={isVoting || isAddingOption} disabled={!customBody.trim()}>
            <Plus size={16} strokeWidth={2.75} />
          </Button>
        </form>
      )}

      {deferred && !closed && (
        <div className={styles.submitRow}>
          {hasVoted ? (
            <button
              type="button"
              className={`${styles.submit} ${poll.allowRevote ? '' : styles.submitDone}`}
              onClick={handleRevote}
              disabled={!poll.allowRevote || isSetting}
            >
              {poll.allowRevote ? t('revoteButton') : t('votedLabel')}
            </button>
          ) : (
            <button
              type="button"
              className={styles.submit}
              onClick={handleSubmit}
              disabled={selected.length === 0 || isSetting}
            >
              {t('submitLabel')}
            </button>
          )}
        </div>
      )}

      <footer className={styles.foot}>
        <div className={styles.totalsRow}>
          <span className={styles.totals}>{t('votesCount', { count: poll.totalVotes })}</span>
          {!poll.isAnonymous && poll.totalVotes > 0 && (
            <Tooltip content={t('viewVoters')}>
              <button
                type="button"
                className={styles.eye}
                onClick={() => setVotersOpen(true)}
                aria-label={t('viewVoters')}
              >
                <Eye size={16} />
              </button>
            </Tooltip>
          )}
        </div>
        {closed && (
          <span className={styles.closedBadge}>
            <Lock size={12} aria-hidden="true" />
            {t('closedBadge')}
          </span>
        )}
        {poll.canManage && (
          <div className={styles.actions}>
              {!closed && (
                <Tooltip content={t('closeLabel')}>
                  <button
                    type="button"
                    className={styles.action}
                    onClick={handleClose}
                    disabled={isClosing}
                    aria-label={t('closeLabel')}
                  >
                    <SquareStop size={16} />
                  </button>
                </Tooltip>
              )}
              <Tooltip content={t('deleteLabel')}>
                <button
                  type="button"
                  className={`${styles.action} ${styles.danger}`}
                  onClick={() => setConfirmOpen(true)}
                  aria-label={t('deleteLabel')}
                >
                  <Trash2 size={16} />
                </button>
              </Tooltip>
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

      {!poll.isAnonymous && (
        <PollVotersModal poll={poll} isOpen={votersOpen} onClose={() => setVotersOpen(false)} />
      )}
    </article>
  );
};
