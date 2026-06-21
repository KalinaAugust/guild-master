import { HTMLAttributes, forwardRef } from 'react';
import styles from './Card.module.css';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  className,
  variant = 'default',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={clsx(styles.card, styles[`variant_${variant}`], className)}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
