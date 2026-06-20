'use client';

import React from 'react';
import { Gamepad2, Users, Calendar, Clock, Trash2, PartyPopper, Dumbbell, Dices, Puzzle, Mail } from 'lucide-react';
import { ActivityEvent, ActivityType } from '@/shared/types';
import { Button } from '@/shared/ui/Button';
import { CopyLinkButton } from '@/shared/ui/CopyLinkButton';
import { stripMarkdown } from '@/shared/lib/stripMarkdown';
import styles from './EventCard.module.css';

interface ParticipantCount {
  total: number;
  confirmed: number;
}

interface EventCardProps {
  event: ActivityEvent;
  participantCount?: ParticipantCount;
  onClick?: (event: ActivityEvent) => void;
  onDelete?: (id: string) => void;
  showInviteBadge?: boolean;
}

const typeIcons: Record<ActivityType, React.ReactNode> = {
  game: <Gamepad2 size={20} />,
  meeting: <Users size={20} />,
  other: <Calendar size={20} />,
  party: <PartyPopper size={20} />,
  sport: <Dumbbell size={20} />,
  dnd: <Dices size={20} />,
  boardgame: <Puzzle size={20} />,
};

export const EventCard: React.FC<EventCardProps> = ({ event, participantCount, onClick, onDelete, showInviteBadge }) => {
  return (
    <div
      className={`${styles.card} ${styles[`type_${event.type}`]} ${onClick ? styles.clickable : ''}`}
      onClick={() => onClick?.(event)}
    >
      <div className={styles.iconWrapper}>
        {typeIcons[event.type]}
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <h3 className={styles.title}>{event.title}</h3>
            {showInviteBadge && (
              <div className={styles.inviteBadge} title="You are invited">
                <Mail size={12} strokeWidth={2.5} />
              </div>
            )}
          </div>
          <div className={styles.meta}>
            <div className={styles.timeWrapper}>
              <Clock size={14} />
              <span>{event.time}</span>
            </div>
            {participantCount !== undefined && (
              <div className={styles.participantWrapper}>
                <Users size={14} />
                <span>{participantCount.confirmed} / {participantCount.total}</span>
              </div>
            )}
          </div>
        </div>

        {event.description ? (
          <p className={styles.description}>{stripMarkdown(event.description)}</p>
        ) : (
          <div className={styles.descriptionPlaceholder} aria-hidden="true" />
        )}
      </div>

      <div className={styles.actions}>
        <CopyLinkButton
          link={`${typeof window !== 'undefined' ? window.location.origin : ''}/events/${event.publicId ?? event.id}`}
          variant="ghost"
          size="icon_sm"
          className={styles.actionBtn}
        />
        {onDelete && (
          <Button
            variant="ghost"
            size="icon_sm"
            onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
            className={styles.deleteBtn}
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};
