'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Panel } from '@/shared/ui/Panel';
import { Button } from '@/shared/ui/Button';
import { useGuildSelection, GuildSelect } from '@/features/select-guild';
import { CreateCallToActionModal } from '@/features/call-to-action';
import {
  CallToActionCard,
  useGetCallToActionsQuery,
  useToggleCallToActionInterestMutation,
  useDeleteCallToActionMutation,
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
  const callToActions = data?.callToActions ?? [];
  const canCreate = data?.canCreate ?? false;

  const [modalOpen, setModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [toggleInterest] = useToggleCallToActionInterestMutation();
  const [deleteCallToAction] = useDeleteCallToActionMutation();

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

  return (
    <Panel className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.guildSelect}>
          <GuildSelect value={activeGuildId ?? ''} onValueChange={handleGuildChange} options={guildOptions} />
        </div>
        {canCreate && (
          <Button type="button" variant="primary" className={styles.newButton} onClick={() => setModalOpen(true)}>
            <Plus size={16} />
            {t('newAction')}
          </Button>
        )}
      </div>

      <div className={styles.feed}>
        {isLoading && <CallToActionSkeleton />}
        {!isLoading && callToActions.length === 0 && <p className={styles.empty}>{t('empty')}</p>}
        {!isLoading &&
          callToActions.map((cta) => (
            <CallToActionCard
              key={cta.id}
              cta={cta}
              onToggleInterest={handleToggle}
              onDelete={handleDelete}
              isToggling={togglingId === cta.id}
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
