import * as React from 'react';
import * as Icons from 'lucide-react';
import styles from './NameWithIcon.module.css';

interface NameWithIconProps {
  /** Resolved display name. */
  name: string | null;
  /** lucide-react icon name to render after the name (validated upstream). */
  icon?: string | null;
  /** Shown when name is empty. */
  fallback?: string;
  iconSize?: number;
  /** Extra class merged onto the wrapper (e.g. a link/name style). */
  className?: string;
}

/**
 * Renders a user's display name followed by an optional icon "flair".
 * Domain-agnostic: the icon is looked up by name from lucide-react.
 */
export const NameWithIcon: React.FC<NameWithIconProps> = ({
  name,
  icon,
  fallback = 'Guild Master user',
  iconSize = 16,
  className,
}) => {
  const Icon = icon
    ? (Icons[icon as keyof typeof Icons] as React.ComponentType<{ size?: number }> | undefined)
    : null;

  return (
    <span className={[styles.root, className].filter(Boolean).join(' ')}>
      {name || fallback}
      {Icon && <Icon size={iconSize} />}
    </span>
  );
};
