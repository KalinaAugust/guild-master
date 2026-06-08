import React from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  children: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({ children, className }) => (
  <div className={`${styles.panel} ${className ?? ''}`}>{children}</div>
);
