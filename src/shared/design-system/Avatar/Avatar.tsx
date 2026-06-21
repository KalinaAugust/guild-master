import { HTMLAttributes, forwardRef } from 'react';
import styles from './Avatar.module.css';
import { clsx } from 'clsx';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(({
  className, src, alt, fallback, size = 'md', ...props
}, ref) => {
  return (
    <div ref={ref} className={clsx(styles.avatar, styles[`size_${size}`], className)} {...props}>
      {src ? (
        <img src={src} alt={alt} className={styles.image} />
      ) : (
        <span className={styles.fallback}>{fallback?.substring(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
});
Avatar.displayName = 'Avatar';
