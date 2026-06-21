import { HTMLAttributes, forwardRef } from 'react';
import styles from './Skeleton.module.css';
import { clsx } from 'clsx';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(({
  className, variant = 'text', ...props
}, ref) => {
  return (
    <div ref={ref} className={clsx(styles.skeleton, styles[`variant_${variant}`], className)} {...props} />
  );
});
Skeleton.displayName = 'Skeleton';
