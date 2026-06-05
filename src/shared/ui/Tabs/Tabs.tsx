import * as React from 'react';
import styles from './Tabs.module.css';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** When > 0, renders a small unread badge after the label (capped at "9+"). */
  badge?: number;
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
        {tab.badge != null && tab.badge > 0 && (
          <span className={styles.badge}>{tab.badge > 9 ? '9+' : tab.badge}</span>
        )}
      </button>
    ))}
  </div>
);
