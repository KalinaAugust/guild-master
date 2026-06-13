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
    ? (Icons[icon as keyof typeof Icons] as
        | React.ComponentType<{ size?: number; className?: string }>
        | undefined)
    : null;

  const rootClass = [styles.root, className].filter(Boolean).join(' ');
  const text = name || fallback;

  if (!Icon) {
    return <span className={rootClass}>{text}</span>;
  }

  // Keep the icon glued to the last word so they wrap to a new line together
  // instead of the icon breaking onto a line by itself.
  const words = text.split(' ');
  const lastWord = words.pop() ?? '';
  const head = words.join(' ');

  return (
    <span className={rootClass}>
      {head && `${head} `}
      <span className={styles.lastChunk}>
        {lastWord}
        <Icon size={iconSize} className={styles.icon} />
      </span>
    </span>
  );
};
