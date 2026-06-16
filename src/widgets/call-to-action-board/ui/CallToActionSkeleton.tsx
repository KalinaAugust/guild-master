import React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import styles from './CallToActionBoard.module.css';

/** Placeholder cards shown while the call-to-action feed is loading. */
export const CallToActionSkeleton: React.FC = () => (
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
