import React, { useId } from 'react';
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
  const uniqueId = useId().replace(/:/g, '_');
  const filterId = `spinner-gooey-${uniqueId}`;

  const pixelSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
        ? 16
        : size === 'md'
          ? 28
          : 40;

  const spinnerStyle: React.CSSProperties = {
    width: `${pixelSize}px`,
    height: `${pixelSize}px`,
    color: color,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={[styles.spinner, centered ? styles.centered : '', className]
        .filter(Boolean)
        .join(' ')}
      style={spinnerStyle}
      role={role}
      aria-label={ariaLabel}
      data-testid={dataTestId}
      fill="currentColor"
    >
      <defs>
        <filter id={filterId}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="y" />
          <feColorMatrix
            in="y"
            mode="matrix"
            values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7"
            result="z"
          />
          <feBlend in="SourceGraphic" in2="z" />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        <circle cx="5" cy="12" r="4">
          <animate
            attributeName="cx"
            calcMode="spline"
            dur="2s"
            values="5;8;5"
            keySplines=".36,.62,.43,.99;.79,0,.58,.57"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="19" cy="12" r="4">
          <animate
            attributeName="cx"
            calcMode="spline"
            dur="2s"
            values="19;16;19"
            keySplines=".36,.62,.43,.99;.79,0,.58,.57"
            repeatCount="indefinite"
          />
        </circle>
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="0.75s"
          values="0 12 12;360 12 12"
          repeatCount="indefinite"
        />
      </g>
    </svg>
  );
};
