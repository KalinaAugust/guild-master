import React from 'react';
import { Skeleton } from '@/shared/ui/Skeleton';
import styles from './ChatSkeletons.module.css';

const MessageRowSkeleton: React.FC<{ own?: boolean }> = ({ own }) => (
  <div className={[styles.msgRow, own ? styles.own : ''].filter(Boolean).join(' ')}>
    {!own && <Skeleton circle className={styles.avatar} />}
    <div className={styles.bubble}>
      <Skeleton className={styles.line} />
      <Skeleton className={styles.lineShort} />
    </div>
  </div>
);

/** Placeholder rows shown while guild messages are loading. */
export const MessagesSkeleton: React.FC = () => (
  <div className={styles.messages} aria-busy="true">
    <MessageRowSkeleton />
    <MessageRowSkeleton own />
    <MessageRowSkeleton />
    <MessageRowSkeleton />
    <MessageRowSkeleton own />
  </div>
);
