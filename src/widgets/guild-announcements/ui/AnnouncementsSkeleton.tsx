import React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import styles from './GuildAnnouncements.module.css';

/** Placeholder cards shown while the announcement feed is loading. */
export const AnnouncementsSkeleton: React.FC = () => (
  <div className={styles.skeletonList} aria-busy="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className={styles.skeletonCard}>
        <Skeleton className={styles.skTitle} />
        <Skeleton className={styles.skBody} />
        <Skeleton className={styles.skMeta} />
      </div>
    ))}
  </div>
);
