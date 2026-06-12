import * as React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import styles from './ListRowSkeleton.module.css';

export interface ListRowSkeletonProps {
  /** Round avatar (e.g. members) vs squircle (e.g. guilds). */
  circle?: boolean;
  /** Number of text lines next to the avatar. */
  lines?: 1 | 2;
}

/** Loading placeholder for an avatar + text list row (members, guilds, …). */
export const ListRowSkeleton: React.FC<ListRowSkeletonProps> = ({ circle, lines = 2 }) => (
  <div className={styles.row} aria-hidden>
    <Skeleton circle={circle} className={styles.avatar} />
    <div className={styles.info}>
      <Skeleton className={styles.line} />
      {lines === 2 && <Skeleton className={styles.lineShort} />}
    </div>
  </div>
);
