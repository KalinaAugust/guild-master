'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  useGetGuildByIdQuery,
  useGetJoinRequestsQuery,
  useSubmitJoinRequestMutation,
  useResolveJoinRequestMutation,
  useLeaveGuildMutation,
  openGuildEditModal,
} from '@/entities/guild';
import { useAppDispatch } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui/Button';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { DetailLayout, DetailLayoutSkeleton } from '@/shared/ui/DetailLayout';
import { GuildMembersSection } from '@/widgets/guild-members';
import { JoinRequestItem } from './JoinRequestItem';
import styles from './GuildDetailContent.module.css';

export type MembershipStatus = 'owner' | 'member' | 'pending' | 'none' | 'guest';

interface GuildDetailContentProps {
  guildId: string;
  initialMembershipStatus: MembershipStatus;
}

export const GuildDetailContent: React.FC<GuildDetailContentProps> = ({
  guildId,
  initialMembershipStatus,
}) => {
  const t = useTranslations('GuildDetail');
  const commonT = useTranslations('Common');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>(initialMembershipStatus);

  const { data: guild, isLoading } = useGetGuildByIdQuery(guildId);

  const { data: joinRequests = [] } = useGetJoinRequestsQuery(guildId, {
    skip: membershipStatus !== 'owner',
  });

  const [submitJoinRequest, { isLoading: isSubmitting }] = useSubmitJoinRequestMutation();
  const [resolveJoinRequest] = useResolveJoinRequestMutation();
  const [leaveGuild, { isLoading: isLeaving }] = useLeaveGuildMutation();
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [resolvingState, setResolvingState] = useState<{ id: string; action: 'approve' | 'decline' } | null>(null);

  const handleApply = async () => {
    if (membershipStatus === 'guest') {
      router.push('/login');
      return;
    }
    try {
      await submitJoinRequest(guildId).unwrap();
      setMembershipStatus('pending');
      toast.success(t('joinRequestSuccess'));
    } catch {
      toast.error(t('joinRequestError'));
    }
  };

  const handleResolve = async (requestId: string, action: 'approve' | 'decline') => {
    setResolvingState({ id: requestId, action });
    try {
      await resolveJoinRequest({ guildId, requestId, action }).unwrap();
      toast.success(t('resolveSuccess'));
    } catch {
      toast.error(t('resolveError'));
    } finally {
      setResolvingState(null);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveGuild(guildId).unwrap();
      toast.success(t('leaveSuccess'));
      router.push('/guilds');
    } catch {
      toast.error(t('leaveError'));
    }
  };

  if (isLoading) {
    return <DetailLayoutSkeleton backHref="/guilds" backLabel={t('backToGuilds')} />;
  }

  if (!guild) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.empty}>Guild not found</p>
      </div>
    );
  }

  const handleEdit = () => {
    if (!guild) return;
    dispatch(openGuildEditModal(guild));
  };

  const showApplyFooter = membershipStatus === 'none' || membershipStatus === 'guest';

  return (
    <>
      <DetailLayout
        backHref="/guilds"
        backLabel={t('backToGuilds')}
        title={guild.name}
        left={
          <>
            {guild.description && (
              <div className={styles.infoGroup}>
                <span className={styles.label}>{commonT('description')}</span>
                <p className={styles.description}>{guild.description}</p>
              </div>
            )}

            <div className={styles.infoGroup}>
              <span className={styles.label}>{t('owner')}</span>
              <span className={styles.value}>{guild.ownerName ?? '—'}</span>
            </div>
          </>
        }
        right={
          <>
            {membershipStatus === 'owner' && (
              <>
                <div className={styles.infoGroup}>
                  <span className={styles.label}>{t('pendingRequests')}</span>
                  {joinRequests.length === 0 ? (
                    <p className={styles.empty}>{t('noPendingRequests')}</p>
                  ) : (
                    joinRequests.map((req) => (
                      <JoinRequestItem
                        key={req.id}
                        request={req}
                        onAccept={() => handleResolve(req.id, 'approve')}
                        onDecline={() => handleResolve(req.id, 'decline')}
                        isAccepting={resolvingState?.id === req.id && resolvingState?.action === 'approve'}
                        isDeclining={resolvingState?.id === req.id && resolvingState?.action === 'decline'}
                        disabled={resolvingState?.id === req.id}
                      />
                    ))
                  )}
                </div>

                <div className={`${styles.infoGroup} ${styles.infoGroupGrow}`}>
                  <span className={styles.label}>{t('members')} ({guild.memberCount})</span>
                  <GuildMembersSection guildId={guildId} readOnly fill />
                </div>
              </>
            )}

            {membershipStatus === 'member' && (
              <>
                <div className={`${styles.statusBadge} ${styles.statusMember}`}>
                  {t('youAreMember')}
                </div>

                <div className={`${styles.infoGroup} ${styles.infoGroupGrow}`}>
                  <span className={styles.label}>{t('members')} ({guild.memberCount})</span>
                  <GuildMembersSection guildId={guildId} readOnly fill />
                </div>
              </>
            )}

            {membershipStatus === 'pending' && (
              <div className={`${styles.statusBadge} ${styles.statusPending}`}>
                {t('requestSent')}
              </div>
            )}

            {membershipStatus === 'guest' && (
              <p className={styles.signInText}>{t('signInToApply')}</p>
            )}
          </>
        }
        footer={
          membershipStatus === 'owner' ? (
            <Button type="button" variant="primary" onClick={handleEdit}>
              {commonT('edit')}
            </Button>
          ) : showApplyFooter ? (
            <Button type="button" variant="primary" onClick={handleApply} isLoading={isSubmitting}>
              {t('applyToJoin')}
            </Button>
          ) : membershipStatus === 'member' ? (
            <Button type="button" variant="danger" onClick={() => setIsLeaveConfirmOpen(true)}>
              {t('leaveGuild')}
            </Button>
          ) : undefined
        }
      />

      <ConfirmModal
        isOpen={isLeaveConfirmOpen}
        onClose={() => setIsLeaveConfirmOpen(false)}
        onConfirm={handleLeave}
        title={t('leaveConfirmTitle')}
        description={t('leaveConfirmDescription')}
        confirmLabel={t('leaveGuild')}
        variant="danger"
        isLoading={isLeaving}
      />
    </>
  );
};
