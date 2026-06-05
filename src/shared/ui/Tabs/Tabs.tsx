import * as React from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

/** Controlled underline-style tab bar. Renders only the tabs; the consumer
 *  owns the active state and renders the corresponding panel. */
export const Tabs: React.FC<TabsProps> = ({ tabs, activeId, onChange, className }) => (
  <div className={[styles.tabBar, className].filter(Boolean).join(' ')} role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={activeId === tab.id}
        className={`${styles.tab} ${activeId === tab.id ? styles.tabActive : ''}`}
        onClick={() => onChange(tab.id)}
      >
        {tab.icon}
        {tab.label}
      </button>
    ))}
  </div>
);
