import React from 'react';
import { ActivityEvent } from '@/shared/types';
import styles from './CalendarGrid.module.css';

interface EventsTooltipContentProps {
  events: ActivityEvent[];
}

export const EventsTooltipContent: React.FC<EventsTooltipContentProps> = ({ events }) => (
  <div className={styles.tooltipEventsList}>
    {events.map(event => (
      <div key={event.id} className={`${styles.eventItem} ${styles[`event_${event.type}`]}`}>
        {event.time} {event.title}
      </div>
    ))}
  </div>
);
