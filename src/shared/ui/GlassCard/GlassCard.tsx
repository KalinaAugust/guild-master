import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import styles from './GlassCard.module.css';

export interface GlassCardProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  interactive?: boolean;
  selected?: boolean;
  href?: string;
}

export const GlassCard = React.forwardRef<HTMLElement, GlassCardProps>(
  ({ children, interactive = false, selected = false, className, href, ...props }, ref) => {
    const Component = href ? Link : 'div';
    
    return (
      <Component
        ref={ref as any}
        href={href as string}
        className={clsx(
          styles.card,
          (interactive || !!href) && styles.interactive,
          selected && styles.selected,
          className
        )}
        {...(props as any)}
      >
        {children}
      </Component>
    );
  }
);

GlassCard.displayName = 'GlassCard';
