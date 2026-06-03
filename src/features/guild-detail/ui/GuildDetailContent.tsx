'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetGuildByIdQuery,
  useGetJoinRequestsQuery,
  useSubmitJoinRequestMutation,
  useResolveJoinRequestMutation,
  openGuildEditModal,
} from '@/entities/guild';
import { useAppDispatch } from '@/shared/lib/hooks';
import { Button } from '@/shared/ui/Button';
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
  const [resolveJoinRequest, { isLoading: isResolving }] = useResolveJoinRequestMutation();
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

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!guild) {
    return (
      <div className={styles.container}>
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
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/guilds" className={styles.backLink}>
          <ChevronLeft size={20} />
          {t('backToGuilds')}
        </Link>
        <h1 className={styles.title}>{guild.name}</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.column}>
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

        </div>

        <div className={styles.column}>
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

              <div className={styles.infoGroup}>
                <span className={styles.label}>{t('members')} ({guild.memberCount})</span>
                <GuildMembersSection guildId={guildId} readOnly />
              </div>
            </>
          )}

          {membershipStatus === 'member' && (
            <div className={`${styles.statusBadge} ${styles.statusMember}`}>
              {t('youAreMember')}
            </div>
          )}

          {membershipStatus === 'pending' && (
            <div className={`${styles.statusBadge} ${styles.statusPending}`}>
              {t('requestSent')}
            </div>
          )}

          {membershipStatus === 'guest' && (
            <p className={styles.signInText}>{t('signInToApply')}</p>
          )}
        </div>
      </div>

      {membershipStatus === 'owner' && (
        <div className={styles.footer}>
          <Button type="button" variant="primary" onClick={handleEdit}>
            {commonT('edit')}
          </Button>
        </div>
      )}

      {showApplyFooter && (
        <div className={styles.footer}>
          <Button
            type="button"
            variant="primary"
            onClick={handleApply}
            isLoading={isSubmitting}
          >
            {t('applyToJoin')}
          </Button>
        </div>
      )}
    </div>
  );
};
