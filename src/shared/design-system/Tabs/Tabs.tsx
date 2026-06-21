import { HTMLAttributes, ReactNode, useState } from 'react';
import styles from './Tabs.module.css';
import { clsx } from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  tabs: TabItem[];
  defaultTab?: string;
}

export const Tabs = ({ className, tabs, defaultTab, ...props }: TabsProps) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={clsx(styles.container, className)} {...props}>
      <div className={styles.tabList} role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={clsx(styles.tab, activeTab === tab.id && styles.active)}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tabPanel} role="tabpanel">
        {activeContent}
      </div>
    </div>
  );
};
