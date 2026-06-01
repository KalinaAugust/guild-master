'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetGuildByIdQuery,
  useGetJoinRequestsQuery,
  useSubmitJoinRequestMutation,
  useResolveJoinRequestMutation,
} from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
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
  const router = useRouter();
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>(initialMembershipStatus);

  const { data: guild, isLoading } = useGetGuildByIdQuery(guildId);

  const { data: joinRequests = [] } = useGetJoinRequestsQuery(guildId, {
    skip: membershipStatus !== 'owner',
  });

  const [submitJoinRequest, { isLoading: isSubmitting }] = useSubmitJoinRequestMutation();
  const [resolveJoinRequest] = useResolveJoinRequestMutation();

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
    try {
      await resolveJoinRequest({ guildId, requestId, action }).unwrap();
      toast.success(t('resolveSuccess'));
    } catch {
      toast.error(t('resolveError'));
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

  const showFooter = membershipStatus === 'none' || membershipStatus === 'guest';

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
              <span className={styles.label}>{t('description')}</span>
              <p className={styles.description}>{guild.description}</p>
            </div>
          )}

          <div className={styles.infoGroup}>
            <span className={styles.label}>{t('owner')}</span>
            <span className={styles.value}>{guild.ownerName ?? '—'}</span>
          </div>

          <div className={styles.infoGroup}>
            <span className={styles.label}>{t('members')}</span>
            <div className={styles.memberCount}>
              <Users size={16} />
              <span>{guild.memberCount}</span>
            </div>
          </div>
        </div>

        <div className={styles.column}>
          {membershipStatus === 'owner' && (
            <>
              <div className={`${styles.statusBadge} ${styles.statusOwner}`}>
                <Shield size={14} />
                {t('youAreOwner')}
              </div>

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
                    />
                  ))
                )}
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

      {showFooter && (
        <div className={styles.footer}>
          <Button
            type="button"
            variant="primary"
            onClick={handleApply}
            disabled={isSubmitting}
          >
            {t('applyToJoin')}
          </Button>
        </div>
      )}
    </div>
  );
};
