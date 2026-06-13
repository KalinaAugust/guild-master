import * as React from 'react';
import { User } from 'lucide-react';
import styles from './UserAvatar.module.css';

const iconSizes: Record<string, number> = { sm: 14, md: 18, lg: 22, xl: 62 };

interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Stretch to the container's full width as a square (overrides `size`). */
  fill?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  size = 'md',
  fill = false,
}) => {
  const baseClass = `${styles.base} ${fill ? styles.fill : styles[`size_${size}`]}`;
  const fallbackIconSize = fill ? 72 : iconSizes[size];

  if (avatarUrl) {
    return (
      <div className={baseClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.image} src={avatarUrl} alt={name || 'avatar'} />
      </div>
    );
  }

  if (name) {
    const initials = name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className={`${baseClass} ${styles.initials}`}>
        {initials}
      </div>
    );
  }

  return (
    <div className={baseClass}>
      <User size={fallbackIconSize} />
    </div>
  );
};
