'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Users, MessageSquare } from 'lucide-react';
import { Tabs } from '@/shared/ui/Tabs';
import { useGetCommentsQuery, useGetCommentReadStateQuery } from '@/entities/comment';
import styles from './EventTabs.module.css';

interface EventTabsProps {
  eventId: string;
  currentUserId: string;
  participants: React.ReactNode;
  comments: React.ReactNode;
}

export const EventTabs: React.FC<EventTabsProps> = ({
  eventId,
  currentUserId,
  participants,
  comments,
}) => {
  const t = useTranslations('EventComments');
  const [active, setActive] = useState<'participants' | 'comments'>('participants');

  const { data: commentList = [] } = useGetCommentsQuery(eventId, {
    pollingInterval: 60_000,
    refetchOnFocus: true,
    skipPollingIfUnfocused: true,
  });
  const { data: readState } = useGetCommentReadStateQuery(eventId);

  // Until the read state resolves, show no badge — otherwise an undefined
  // `lastReadAt` briefly counts every comment as unread on load.
  const unreadCount = readState
    ? commentList.filter(
        (c) =>
          c.userId !== currentUserId &&
          (!readState.lastReadAt || c.createdAt > readState.lastReadAt),
      ).length
    : 0;

  return (
    <div className={styles.root}>
      <Tabs
        className={styles.tabBar}
        activeId={active}
        onChange={(id) => setActive(id as 'participants' | 'comments')}
        tabs={[
          { id: 'participants', label: t('tabParticipants'), icon: <Users size={15} /> },
          { id: 'comments', label: t('tabComments'), icon: <MessageSquare size={15} />, badge: unreadCount },
        ]}
      />
      <div className={styles.content}>
        {active === 'participants' ? participants : comments}
      </div>
    </div>
  );
};
