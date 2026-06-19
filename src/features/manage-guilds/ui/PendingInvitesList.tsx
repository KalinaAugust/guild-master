'use client';

import React, { useTransition } from 'react';
import { Guild } from '@/entities/guild';
import { acceptInvite, rejectInvite } from '@/entities/guild/api/invites';
import { Shield } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Panel } from '@/shared/ui/Panel';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import styles from './PendingInvitesList.module.css';
import { toast } from 'sonner';
import { guildApi } from '@/entities/guild/api/guildApi';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
interface PendingInvitesListProps {
  invites: Guild[];
}

export const PendingInvitesList: React.FC<PendingInvitesListProps> = ({ invites }) => {
  const [isPending, startTransition] = useTransition();
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [loadingAction, setLoadingAction] = React.useState<'accept' | 'reject' | null>(null);
  const dispatch = useDispatch();
  const router = useRouter();

  const handleAccept = (guildId: string) => {
    setLoadingId(guildId);
    setLoadingAction('accept');
    startTransition(async () => {
      const res = await acceptInvite(guildId);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Invite accepted');
        dispatch(guildApi.util.invalidateTags([{ type: 'Guild', id: 'LIST' }, { type: 'Guild', id: 'INVITES' }]));
        router.refresh();
      }
      setLoadingId(null);
      setLoadingAction(null);
    });
  };

  const handleReject = (guildId: string) => {
    setLoadingId(guildId);
    setLoadingAction('reject');
    startTransition(async () => {
      const res = await rejectInvite(guildId);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Invite rejected');
        dispatch(guildApi.util.invalidateTags([{ type: 'Guild', id: 'LIST' }, { type: 'Guild', id: 'INVITES' }]));
        router.refresh();
      }
      setLoadingId(null);
      setLoadingAction(null);
    });
  };

  if (!invites || invites.length === 0) return null;

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Pending Invites</h2>
      <ul className={styles.list}>
        {invites.map((guild) => (
          <li key={guild.id} className={styles.row}>
            {guild.avatarUrl ? (
              <UserAvatar avatarUrl={guild.avatarUrl} name={guild.name} size="lg" />
            ) : (
              <span className={styles.iconWrap}>
                <Shield size={28} className={styles.icon} />
              </span>
            )}
            
            <div className={styles.info}>
              <span className={styles.name}>{guild.name}</span>
              {guild.description && <span className={styles.description}>{guild.description}</span>}
            </div>

            <div className={styles.meta}>
              {typeof guild.memberCount === 'number' && (
                <span className={styles.memberCount}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {guild.memberCount}
                </span>
              )}
            </div>

            <div className={styles.actions}>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => handleAccept(guild.id)} 
                disabled={isPending}
                isLoading={isPending && loadingId === guild.id && loadingAction === 'accept'}
              >
                Accept
              </Button>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => handleReject(guild.id)} 
                disabled={isPending}
                isLoading={isPending && loadingId === guild.id && loadingAction === 'reject'}
              >
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
