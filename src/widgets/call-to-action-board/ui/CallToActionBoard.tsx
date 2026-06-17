'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, HelpCircle } from 'lucide-react';
import dayjs from '@/shared/lib/dayjs';
import { Panel } from '@/shared/ui/Panel';
import { Button } from '@/shared/ui/Button';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import { CallToActionCard, CreateCallToActionModal } from '@/features/call-to-action';
import {
  useGetCallToActionsQuery,
  useMarkCallToActionsReadMutation,
  useToggleCallToActionInterestMutation,
  useDeleteCallToActionMutation,
  useLaunchCallToActionMutation,
} from '@/entities/call-to-action';
import type { Guild } from '@/entities/guild';
import { CallToActionSkeleton } from './CallToActionSkeleton';
import styles from './CallToActionBoard.module.css';

interface CallToActionBoardProps {
  guilds: Guild[];
  userId?: string;
  initialGuildId?: string;
}

export const CallToActionBoard: React.FC<CallToActionBoardProps> = ({
  guilds,
  userId,
  initialGuildId,
}) => {
  const t = useTranslations('CallToAction');
  const { activeGuildId, guildOptions, handleGuildChange } = useGuildSelection(guilds, initialGuildId, userId);

  const { data, isLoading } = useGetCallToActionsQuery(activeGuildId ?? '', { skip: !activeGuildId });
  const callToActions = data?.callToActions;
  const canCreate = data?.canCreate ?? false;

  const [modalOpen, setModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const [toggleInterest] = useToggleCallToActionInterestMutation();
  const [deleteCallToAction] = useDeleteCallToActionMutation();
  const [launchCallToAction] = useLaunchCallToActionMutation();

  const sortedCallToActions = useMemo(() => {
    const now = dayjs();
    const list = callToActions ?? [];
    return [...list].sort((a, b) => {
      const aExpired = dayjs(a.eventDate).diff(now) <= 0;
      const bExpired = dayjs(b.eventDate).diff(now) <= 0;

      if (aExpired && !bExpired) return 1;
      if (!aExpired && bExpired) return -1;
      return 0;
    });
  }, [callToActions]);

  // Opening the board clears the sidebar unread dot for the active guild.
  const [markRead] = useMarkCallToActionsReadMutation();
  useEffect(() => {
    if (activeGuildId) markRead(activeGuildId);
  }, [activeGuildId, markRead]);

  const handleToggle = async (ctaId: string) => {
    if (!activeGuildId) return;
    setTogglingId(ctaId);
    try {
      const updated = await toggleInterest({ guildId: activeGuildId, ctaId }).unwrap();
      if (updated.eventId) toast.success(t('launchedToast'));
    } catch {
      toast.error(t('toggleError'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (ctaId: string) => {
    if (!activeGuildId) return;
    try {
      await deleteCallToAction({ guildId: activeGuildId, ctaId }).unwrap();
    } catch {
      toast.error(t('deleteError'));
    }
  };

  const handleLaunch = async (ctaId: string) => {
    if (!activeGuildId) return;
    setLaunchingId(ctaId);
    try {
      await launchCallToAction({ guildId: activeGuildId, ctaId }).unwrap();
      toast.success(t('manualLaunchedToast'));
    } catch {
      toast.error(t('launchError'));
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <Panel className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.guildSelect}>
          <GuildSelect value={activeGuildId ?? ''} onValueChange={handleGuildChange} options={guildOptions} />
        </div>
        <div className={styles.actions}>
          <Tooltip content={t('helpTooltip')} side="bottom">
            <button type="button" className={styles.helpButton} aria-label={t('helpAria')}>
              <HelpCircle size={20} />
            </button>
          </Tooltip>
          {canCreate && (
            <Button type="button" variant="primary" className={styles.newButton} onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              {t('newAction')}
            </Button>
          )}
        </div>
      </div>

      <div className={styles.feed}>
        {isLoading && <CallToActionSkeleton />}
        {!isLoading && sortedCallToActions.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
        {!isLoading &&
          sortedCallToActions.map((cta) => (
            <CallToActionCard
              key={cta.id}
              cta={cta}
              onToggleInterest={handleToggle}
              onDelete={handleDelete}
              isToggling={togglingId === cta.id}
              onLaunch={handleLaunch}
              isLaunching={launchingId === cta.id}
            />
          ))}
      </div>

      {activeGuildId && (
        <CreateCallToActionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          guildId={activeGuildId}
        />
      )}
    </Panel>
  );
};
