'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { UserMinus, User, Shield, ShieldCheck, ShieldOff, MoreVertical, Crown } from 'lucide-react';
import { toast } from 'sonner';
import * as Form from '@radix-ui/react-form';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
  useUpdateGuildMemberRoleMutation,
  useTransferGuildOwnershipMutation,
  useGuildPermissions,
} from '@/entities/guild';
import { resolveDisplayName } from '@/entities/user';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ListRowSkeleton } from '@/shared/ui/ListRowSkeleton';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { NameWithIcon } from '@/shared/ui/NameWithIcon';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import styles from './GuildMembersSection.module.css';

interface GuildMembersSectionProps {
  guildId: string;
  userId?: string;
  readOnly?: boolean;
  /** Fill the parent's height and scroll only when members overflow. */
  fill?: boolean;
}

type PendingAction =
  | { type: 'remove'; userId: string; name: string }
  | { type: 'promote'; userId: string; name: string }
  | { type: 'revoke'; userId: string; name: string }
  | { type: 'transfer'; userId: string; name: string };

const ROLE_ORDER: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };

export const GuildMembersSection: React.FC<GuildMembersSectionProps> = ({ guildId, userId, readOnly = false, fill = false }) => {
  const t = useTranslations('GuildMembers');
  const [email, setEmail] = useState('');
  const { data: members = [], isLoading } = useGetGuildMembersQuery(guildId);
  const [addMember, { isLoading: isAdding }] = useAddGuildMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveGuildMemberMutation();
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateGuildMemberRoleMutation();
  const [transferOwnership, { isLoading: isTransferring }] = useTransferGuildOwnershipMutation();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const { canManageMembers, isOwner } = useGuildPermissions(guildId, userId);
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

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      if (pending.type === 'remove') {
        await removeMember({ guildId, userId: pending.userId }).unwrap();
      } else if (pending.type === 'transfer') {
        await transferOwnership({ guildId, newOwnerId: pending.userId }).unwrap();
      } else {
        await updateRole({
          guildId,
          userId: pending.userId,
          role: pending.type === 'promote' ? 'ADMIN' : 'MEMBER',
        }).unwrap();
      }
      setPending(null);
    } catch {
      if (pending.type === 'remove') toast.error(t('removeError'));
      else if (pending.type === 'transfer') toast.error(t('transferError'));
      else toast.error(t('roleError'));
    }
  };

  const confirmCopy = () => {
    if (!pending) return { title: '', description: undefined as string | undefined, label: '', variant: 'danger' as const };
    if (pending.type === 'remove') {
      return { title: t('removeMember'), description: t('removeConfirm', { name: pending.name }), label: t('remove'), variant: 'danger' as const };
    }
    if (pending.type === 'promote') {
      return { title: t('makeOfficer'), description: t('promoteConfirm', { name: pending.name }), label: t('confirm'), variant: 'primary' as const };
    }
    if (pending.type === 'transfer') {
      return { title: t('transferOwnership'), description: t('transferConfirm', { name: pending.name }), label: t('transferOwnership'), variant: 'danger' as const };
    }
    return { title: t('revokeOfficer'), description: t('revokeConfirm', { name: pending.name }), label: t('confirm'), variant: 'primary' as const };
  };
  const copy = confirmCopy();

  const sorted = [...members].sort((a, b) => {
    // The current user always comes first, regardless of role.
    if (userId) {
      if (a.userId === userId) return -1;
      if (b.userId === userId) return 1;
    }
    return (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
  });

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
        <div className={styles.skeletonList}>
          {Array.from({ length: 5 }).map((_, i) => (
            <ListRowSkeleton key={i} circle lines={1} />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className={styles.empty}>{t('empty')}</p>
      ) : (
        <ul className={`${styles.list} ${fill ? styles.listFill : ''}`}>
          {sorted.map((member) => {
            const memberName = resolveDisplayName({
              fullName: member.profile.fullName,
              alias: member.profile.alias,
              displayAsAlias: member.profile.displayAsAlias,
            });
            const isSelf = !!userId && member.userId === userId;
            const about = member.profile.about;
            const canRemove = effectiveCanManage && !isSelf && member.role !== 'OWNER' &&
              (member.role !== 'ADMIN' || isOwner);
            const canChangeRole = effectiveCanManage && !isSelf && isOwner && member.role !== 'OWNER';
            const canTransfer = canChangeRole;
            const showMenu = canRemove || canChangeRole || canTransfer;
            return (
            <li key={member.userId} className={`${styles.item} ${isSelf ? styles.selfItem : ''}`}>
              <ProfileLink
                publicId={member.profile.publicId}
                aria-label={memberName ?? undefined}
                className={styles.avatarLink}
              >
                <UserAvatar
                  avatarUrl={member.profile.avatarUrl}
                  name={memberName}
                  size="sm"
                />
              </ProfileLink>
              <div className={styles.nameCol}>
                <ProfileLink publicId={member.profile.publicId} className={styles.name}>
                  <NameWithIcon name={memberName ?? member.userId} icon={member.profile.icon} fallback={member.userId} iconSize={14} />
                </ProfileLink>
                {about && <span className={styles.note}>{about}</span>}
              </div>
              <div className={styles.roleGroup}>
                <span className={styles.role}>{t(`role${member.role}`)}</span>
                {member.role === 'OWNER' && (
                  <span className={styles.ownerIcon}>
                    <ShieldCheck size={14} />
                  </span>
                )}
                {member.role === 'ADMIN' && (
                  <span className={styles.adminIcon}>
                    <Shield size={14} />
                  </span>
                )}
                {member.role === 'MEMBER' && (
                  <span className={styles.memberIcon}>
                    <User size={14} />
                  </span>
                )}
              </div>
              {showMenu && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button type="button" className={styles.menuTrigger} aria-label={t('memberActions')}>
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className={styles.menuContent} side="bottom" align="end" sideOffset={4}>
                      {canChangeRole && member.role === 'MEMBER' && (
                        <DropdownMenu.Item
                          className={styles.menuItem}
                          onSelect={() => setPending({ type: 'promote', userId: member.userId, name: memberName ?? member.userId })}
                        >
                          <Shield size={16} />
                          <span>{t('makeOfficer')}</span>
                        </DropdownMenu.Item>
                      )}
                      {canChangeRole && member.role === 'ADMIN' && (
                        <DropdownMenu.Item
                          className={styles.menuItem}
                          onSelect={() => setPending({ type: 'revoke', userId: member.userId, name: memberName ?? member.userId })}
                        >
                          <ShieldOff size={16} />
                          <span>{t('revokeOfficer')}</span>
                        </DropdownMenu.Item>
                      )}
                      {canTransfer && (
                        <DropdownMenu.Item
                          className={styles.menuItem}
                          onSelect={() => setPending({ type: 'transfer', userId: member.userId, name: memberName ?? member.userId })}
                        >
                          <Crown size={16} />
                          <span>{t('transferOwnership')}</span>
                        </DropdownMenu.Item>
                      )}
                      {canRemove && (
                        <DropdownMenu.Item
                          className={`${styles.menuItem} ${styles.menuItemDanger}`}
                          onSelect={() => setPending({ type: 'remove', userId: member.userId, name: memberName ?? member.userId })}
                        >
                          <UserMinus size={16} />
                          <span>{t('removeMember')}</span>
                        </DropdownMenu.Item>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              )}
            </li>
            );
          })}
        </ul>
      )}

      <ConfirmModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        title={copy.title}
        description={copy.description}
        confirmLabel={copy.label}
        variant={copy.variant}
        isLoading={isRemoving || isUpdatingRole || isTransferring}
      />
    </div>
  );
};
