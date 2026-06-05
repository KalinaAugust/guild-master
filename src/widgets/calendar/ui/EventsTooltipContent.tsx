import React from 'react';
import { ActivityEvent } from '@/shared/types';
import { typeIcons } from '@/entities/event';
import styles from './CalendarGrid.module.css';


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
