import React from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  disablePadding?: boolean;
}

export const Panel: React.FC<PanelProps> = ({ children, className, disablePadding }) => (
  <div className={`${styles.panel} ${disablePadding ? styles.disablePadding : ''} ${className ?? ''}`}>{children}</div>
);
