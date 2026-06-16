'use client';

import React from 'react';
import { Users, Plus } from 'lucide-react';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { ProfileLink } from '@/shared/ui/ProfileLink';
import { NameWithIcon } from '@/shared/ui/NameWithIcon';
import { Tooltip } from '@/shared/ui/Tooltip';
import { resolveDisplayName } from '@/entities/user';
import type { CtaParticipant } from '@/entities/call-to-action';
import styles from './ParticipantSlots.module.css';

const MAX_SLOTS = 15;

const displayName = (p: CtaParticipant): string =>
  resolveDisplayName({ fullName: p.fullName, alias: p.alias, displayAsAlias: p.displayAsAlias }) ?? '';

interface ParticipantSlotsProps {
  participants: CtaParticipant[];
  targetCount: number;
}

export const ParticipantSlots: React.FC<ParticipantSlotsProps> = ({ participants, targetCount }) => {
  const overflow = participants.length > MAX_SLOTS;
  const shown = overflow ? participants.slice(0, MAX_SLOTS) : participants;
  const hidden = overflow ? participants.slice(MAX_SLOTS) : [];
  // Empty circles fill the row up to the target, but never push the row past the cap.
  const emptyCount = overflow ? 0 : Math.max(Math.min(targetCount, MAX_SLOTS) - shown.length, 0);

  return (
    <div className={styles.row}>
      {shown.map((p) => {
        const name = displayName(p);
        return (
          <Tooltip key={p.userId} content={<NameWithIcon name={name} icon={p.icon} fallback={p.userId} iconSize={13} />}>
            <ProfileLink publicId={p.publicId} className={styles.slotLink} aria-label={name || undefined}>
              <span className={styles.slot}>
                <UserAvatar avatarUrl={p.avatarUrl} name={name} fill />
              </span>
            </ProfileLink>
          </Tooltip>
        );
      })}

      {Array.from({ length: emptyCount }).map((_, i) => (
        <span key={`empty-${i}`} className={`${styles.slot} ${styles.empty}`} aria-hidden="true">
          <Plus size={18} />
        </span>
      ))}

      {overflow && (
        <Tooltip
          content={
            <span className={styles.overflowList}>
              {hidden.map((p) => (
                <NameWithIcon key={p.userId} name={displayName(p)} icon={p.icon} fallback={p.userId} iconSize={13} />
              ))}
            </span>
          }
        >
          <span className={`${styles.slot} ${styles.overflow}`}>
            <Users size={16} />
            <span className={styles.overflowCount}>+{hidden.length}</span>
          </span>
        </Tooltip>
      )}
    </div>
  );
};
