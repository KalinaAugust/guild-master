import React from 'react';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | number;
  color?: string;
  centered?: boolean;
  className?: string;
  'aria-label'?: string;
  role?: string;
  'data-testid'?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'var(--accent-primary)',
  centered = false,
  className = '',
  'aria-label': ariaLabel,
  role = 'status',
  'data-testid': dataTestId,
}) => {
  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
        ? 16
        : size === 'md'
          ? 28
          : 40;

  // Keep border-width proportional to spinner size (at least 2px)
  const borderWidth = Math.max(2, Math.round(pixelSize / 12));

  const spinnerStyle: React.CSSProperties = {
    width: `${pixelSize}px`,
    height: `${pixelSize}px`,
    borderWidth: `${borderWidth}px`,
    borderColor: `${color}`,
    borderBottomColor: 'transparent',
  };

  return (
    <span
      className={[styles.spinner, centered ? styles.centered : '', className]
        .filter(Boolean)
        .join(' ')}
      style={spinnerStyle}
      role={role}
      aria-label={ariaLabel}
      data-testid={dataTestId}
    />
  );
};
