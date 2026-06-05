'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './EventTabs.module.css';

interface EventTabsProps {
  participants: React.ReactNode;
  comments: React.ReactNode;
}

export const EventTabs: React.FC<EventTabsProps> = ({ participants, comments }) => {
  const t = useTranslations('EventComments');
  const [active, setActive] = useState<'participants' | 'comments'>('participants');

  return (
    <div className={styles.root}>
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={active === 'participants'}
          className={`${styles.tab} ${active === 'participants' ? styles.tabActive : ''}`}
          onClick={() => setActive('participants')}
        >
          {t('tabParticipants')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={active === 'comments'}
          className={`${styles.tab} ${active === 'comments' ? styles.tabActive : ''}`}
          onClick={() => setActive('comments')}
        >
          {t('tabComments')}
        </button>
      </div>
      <div className={styles.content}>
        {active === 'participants' ? participants : comments}
      </div>
    </div>
  );
};
