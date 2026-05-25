'use client';

import React, { useState } from 'react';
import { UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetGuildMembersQuery,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
} from '@/entities/guild';
import { Button } from '@/shared/ui/Button';
import styles from './GuildMembersSection.module.css';

interface GuildMembersSectionProps {
  guildId: string;
}

export const GuildMembersSection: React.FC<GuildMembersSectionProps> = ({ guildId }) => {
  const [email, setEmail] = useState('');
  const { data: members = [], isLoading } = useGetGuildMembersQuery(guildId);
  const [addMember, { isLoading: isAdding }] = useAddGuildMemberMutation();
  const [removeMember] = useRemoveGuildMemberMutation();

  const handleAdd = async (e: React.FormEvent) => {
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
    try {
      await removeMember({ guildId, userId }).unwrap();
    } catch {
      toast.error('Failed to remove member');
    }
  };

  return (
    <div className={styles.root}>
      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          className={styles.emailInput}
        />
        <Button type="submit" variant="primary" disabled={!email.trim() || isAdding}>
          Add
        </Button>
      </form>

      {isLoading ? (
        <p className={styles.loading}>Loading…</p>
      ) : members.length === 0 ? (
        <p className={styles.empty}>No members yet.</p>
      ) : (
        <ul className={styles.list}>
          {members.map((member) => (
            <li key={member.userId} className={styles.item}>
              <span className={styles.name}>
                {member.profile.fullName ?? member.userId}
              </span>
              <span className={styles.role}>{member.role}</span>
              {member.role !== 'OWNER' && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemove(member.userId)}
                  aria-label="Remove member"
                >
                  <UserMinus size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
