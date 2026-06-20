import React from 'react';
import { ActivityEvent } from '@/shared/types';
import { typeIcons } from '@/entities/event';
import styles from './CalendarGrid.module.css';


interface EventsTooltipContentProps {
  events: ActivityEvent[];
  onEventClick?: (e: React.MouseEvent, event: ActivityEvent) => void;
}

export const EventsTooltipContent: React.FC<EventsTooltipContentProps> = ({ events, onEventClick }) => (
  <div className={styles.tooltipEventsList}>
    {events.map(event => (
      <div
        key={event.id}
        className={`${styles.eventItem} ${styles.tooltipEventItem} ${styles[`event_${event.type}`]}`}
        onClick={(e) => onEventClick?.(e, event)}
      >
        <span className={styles.tooltipEventText}><span className={styles.eventTime}>{event.time}</span> {event.title}</span>
        <span className={`${styles.tooltipIcon} ${styles[`iconType_${event.type}`]}`} aria-hidden="true">{typeIcons[event.type]}</span>
      </div>
    ))}
  </div>
);
