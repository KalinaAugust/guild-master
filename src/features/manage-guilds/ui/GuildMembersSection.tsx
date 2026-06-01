'use client';

import React, { useState } from 'react';
import { UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import * as Form from '@radix-ui/react-form';
import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
} from '@/entities/guild';
import { useGuildPermissions } from '@/shared/lib/useGuildPermissions';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import styles from './GuildMembersSection.module.css';

interface GuildMembersSectionProps {
  guildId: string;
  userId?: string;
}

export const GuildMembersSection: React.FC<GuildMembersSectionProps> = ({ guildId, userId }) => {
  const [email, setEmail] = useState('');
  const { data: members = [], isLoading } = useGetGuildMembersQuery(guildId);
  const [addMember, { isLoading: isAdding }] = useAddGuildMemberMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveGuildMemberMutation();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { canManageMembers } = useGuildPermissions(guildId, userId);
  const effectiveCanManage = !userId || canManageMembers;

  const handleAdd = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await addMember({ guildId, email: email.trim() }).unwrap();
      setEmail('');
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 404) toast.error('User with this email not found');
      else if (status === 409) toast.error('User is already a member');
      else toast.error('Failed to add member');
    }
  };

  const handleRemove = async (userId: string) => {
    setRemovingId(userId);
    try {
      await removeMember({ guildId, userId }).unwrap();
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className={styles.root}>
      {effectiveCanManage && (
        <Form.Root onSubmit={handleAdd} className={styles.addForm}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={styles.emailInput}
          />
          <Button type="submit" variant="primary" isLoading={isAdding} disabled={!email.trim()}>
            Add
          </Button>
        </Form.Root>
      )}

      {isLoading ? (
        <p className={styles.loading}>Loading…</p>
      ) : members.length === 0 ? (
        <p className={styles.empty}>No members yet.</p>
      ) : (
        <ul className={styles.list}>
          {[...members].sort((a, b) => (a.role === 'OWNER' ? -1 : b.role === 'OWNER' ? 1 : 0)).map((member) => (
            <li key={member.userId} className={styles.item}>
              <span className={styles.name}>
                {member.profile.fullName ?? member.userId}
              </span>
              <span className={styles.role}>{member.role}</span>
              {effectiveCanManage && member.role !== 'OWNER' && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon_sm"
                  className={styles.removeBtn}
                  onClick={() => handleRemove(member.userId)}
                  aria-label="Remove member"
                  isLoading={removingId === member.userId && isRemoving}
                  disabled={removingId !== null && removingId !== member.userId}
                >
                  <UserMinus size={14} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
