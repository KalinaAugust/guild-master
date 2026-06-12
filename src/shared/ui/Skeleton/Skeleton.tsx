import * as React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  /** Sizing/shape class supplied by the consumer (CSS Module). */
  className?: string;
  /** Render as a circle (e.g. avatar placeholder). */
  circle?: boolean;
}

/** Domain-agnostic shimmering placeholder block for loading states. */
export const Skeleton: React.FC<SkeletonProps> = ({ className, circle }) => (
  <span
    aria-hidden
    className={[styles.skeleton, circle ? styles.circle : '', className].filter(Boolean).join(' ')}
  />
);
