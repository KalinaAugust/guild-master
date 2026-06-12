import * as React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import styles from './EventCardSkeleton.module.css';

/** Loading placeholder shaped like an EventCard (icon tile + title/desc + meta). */
export const EventCardSkeleton: React.FC = () => (
  <div className={styles.card} aria-hidden>
    <Skeleton className={styles.icon} />
    <div className={styles.content}>
      <Skeleton className={styles.title} />
      <Skeleton className={styles.desc} />
    </div>
    <div className={styles.meta}>
      <Skeleton className={styles.metaLine} />
    </div>
  </div>
);
