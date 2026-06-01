import React from 'react';
import type { EventParticipant } from '@/shared/types';
import styles from './UpcomingEventsStrip.module.css';

interface Props {
  participants: EventParticipant[];
}

export const ParticipantsTooltip: React.FC<Props> = ({ participants }) => {
  const confirmed = participants.filter(p => p.status === 'confirmed');
  if (confirmed.length === 0) {
    return <span className={styles.tooltipEmpty}>Нет подтверждений</span>;
  }
  return (
    <div className={styles.participantsList}>
      <div className={styles.tooltipLabel}>Подтвердили участие</div>
      {confirmed.map(p => (
        <div key={p.id} className={styles.participantRow}>
          <div className={styles.avatar}>
            {p.profile.avatarUrl
              ? <img src={p.profile.avatarUrl} alt="" className={styles.avatarImg} />
              : <span className={styles.avatarInitial}>{p.profile.fullName?.[0] ?? '?'}</span>
            }
          </div>
          <span className={styles.participantName}>{p.profile.fullName ?? 'Unknown'}</span>
        </div>
      ))}
    </div>
  );
};
