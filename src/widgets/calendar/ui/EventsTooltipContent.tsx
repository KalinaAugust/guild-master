import React from 'react';
import { Sword, Gamepad2, Users, Calendar, Skull, PartyPopper, Dumbbell, Dices, Puzzle } from 'lucide-react';
import { ActivityEvent, ActivityType } from '@/shared/types';
import styles from './CalendarGrid.module.css';

export const typeIcons: Record<ActivityType, React.ReactNode> = {
  raid: <Sword size={14} />,
  game: <Gamepad2 size={14} />,
  meeting: <Users size={14} />,
  other: <Calendar size={14} />,
  dungeon: <Skull size={14} />,
  party: <PartyPopper size={14} />,
  sport: <Dumbbell size={14} />,
  dnd: <Dices size={14} />,
  boardgame: <Puzzle size={14} />,
};

interface EventsTooltipContentProps {
  events: ActivityEvent[];
}

export const EventsTooltipContent: React.FC<EventsTooltipContentProps> = ({ events }) => (
  <div className={styles.tooltipEventsList}>
    {events.map(event => (
      <div key={event.id} className={`${styles.eventItem} ${styles.tooltipEventItem} ${styles[`event_${event.type}`]}`}>
        <span className={styles.tooltipEventText}>{event.time} {event.title}</span>
        <span className={`${styles.tooltipIcon} ${styles[`iconType_${event.type}`]}`} aria-hidden="true">{typeIcons[event.type]}</span>
      </div>
    ))}
  </div>
);
