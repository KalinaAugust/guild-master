'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { UserMinus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import * as Form from '@radix-ui/react-form';
import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
  useGuildPermissions,
} from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import styles from './GuildMembersSection.module.css';

interface GuildMembersSectionProps {
  guildId: string;
  userId?: string;
  readOnly?: boolean;
  /** Fill the parent's height and scroll only when members overflow. */
  fill?: boolean;
}

export const GuildMembersSection: React.FC<GuildMembersSectionProps> = ({ guildId, userId, readOnly = false, fill = false }) => {
  const t = useTranslations('GuildMembers');
  const [email, setEmail] = useState('');
  const { data: members = [], isLoading } = useGetGuildMembersQuery(guildId);
  const [addMember, { isLoading: isAdding }] = useAddGuildMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveGuildMemberMutation();
  const [pendingRemove, setPendingRemove] = useState<{ userId: string; name: string } | null>(null);
  const { canManageMembers } = useGuildPermissions(guildId, userId);
  const effectiveCanManage = !readOnly && (!userId || canManageMembers);

  const handleAdd = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!z.email().safeParse(trimmed).success) {
      toast.error(t('invalidEmail'));
      return;
    }
    try {
      await addMember({ guildId, email: trimmed }).unwrap();
      setEmail('');
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 404) toast.error(t('userNotFound'));
      else if (status === 409) toast.error(t('alreadyMember'));
      else toast.error(t('addError'));
    }
  };

  const handleRemove = async () => {
    if (!pendingRemove) return;
    try {
      await removeMember({ guildId, userId: pendingRemove.userId }).unwrap();
      setPendingRemove(null);
    } catch {
      toast.error(t('removeError'));
    }
  };

  return (
    <div className={`${styles.root} ${fill ? styles.rootFill : ''}`}>
      {effectiveCanManage && (
        <Form.Root onSubmit={handleAdd} className={styles.addForm} noValidate>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={styles.emailInput}
          />
          <Button type="submit" variant="primary" isLoading={isAdding} disabled={!email.trim()}>
            {t('add')}
          </Button>
        </Form.Root>
      )}

      {isLoading ? (
        <p className={styles.loading}>{t('loading')}</p>
      ) : members.length === 0 ? (
        <p className={styles.empty}>{t('empty')}</p>
      ) : (
        <ul className={`${styles.list} ${fill ? styles.listFill : ''}`}>
          {[...members].sort((a, b) => (a.role === 'OWNER' ? -1 : b.role === 'OWNER' ? 1 : 0)).map((member) => (
            <li key={member.userId} className={styles.item}>
              <ProfileLink
                publicId={member.profile.publicId}
                aria-label={member.profile.fullName ?? undefined}
              >
                <UserAvatar
                  avatarUrl={member.profile.avatarUrl}
                  name={member.profile.fullName}
                  size="sm"
                />
              </ProfileLink>
              <ProfileLink publicId={member.profile.publicId} className={styles.name}>
                {member.profile.fullName ?? member.userId}
              </ProfileLink>
              <span className={styles.role}>{member.role}</span>
              {member.role === 'OWNER' && (
                <span className={styles.ownerIcon}>
                  <Shield size={14} />
                </span>
              )}
              {effectiveCanManage && member.role !== 'OWNER' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon_sm"
                  className={styles.removeBtn}
                  onClick={() => setPendingRemove({
                    userId: member.userId,
                    name: member.profile.fullName ?? member.userId,
                  })}
                  aria-label={t('removeMember')}
                >
                  <UserMinus size={14} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        isOpen={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        onConfirm={handleRemove}
        title={t('removeMember')}
        description={pendingRemove ? t('removeConfirm', { name: pendingRemove.name }) : undefined}
        confirmLabel={t('remove')}
        variant="danger"
        isLoading={isRemoving}
      />
    </div>
  );
};
