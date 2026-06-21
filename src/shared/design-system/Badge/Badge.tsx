import { HTMLAttributes, forwardRef } from 'react';
import styles from './Badge.module.css';
import { clsx } from 'clsx';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({
  className, variant = 'default', children, ...props
}, ref) => {
  return (
    <span ref={ref} className={clsx(styles.badge, styles[`variant_${variant}`], className)} {...props}>
      {children}
    </span>
  );
});
Badge.displayName = 'Badge';
