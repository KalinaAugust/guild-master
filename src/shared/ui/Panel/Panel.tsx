import React from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  disablePadding?: boolean;
  style?: React.CSSProperties;
}

export const Panel: React.FC<PanelProps> = ({ children, className, disablePadding, style }) => (
  <div
    className={`${styles.panel} ${disablePadding ? styles.disablePadding : ''} ${className ?? ''}`}
    style={style}
  >
    {children}
  </div>
);
