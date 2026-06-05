'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users, MessageSquare } from 'lucide-react';
import { Tabs } from '@/shared/ui/Tabs';
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
      <Tabs
        className={styles.tabBar}
        activeId={active}
        onChange={(id) => setActive(id as 'participants' | 'comments')}
        tabs={[
          { id: 'participants', label: t('tabParticipants'), icon: <Users size={15} /> },
          { id: 'comments', label: t('tabComments'), icon: <MessageSquare size={15} /> },
        ]}
      />
      <div className={styles.content}>
        {active === 'participants' ? participants : comments}
      </div>
    </div>
  );
};
