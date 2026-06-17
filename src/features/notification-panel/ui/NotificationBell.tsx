'use client';

import { Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useGetNotificationsQuery, useMarkAllReadMutation, NOTIFICATION_TYPE_CONFIG } from '@/entities/notification';
import { NotificationPanel } from './NotificationPanel';
import styles from './NotificationBell.module.css';

interface Props {
  userId?: string;
}

export const NotificationBell = ({ userId }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications = [] } = useGetNotificationsQuery(undefined, {
    refetchOnFocus: true,
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });
  const [markAllRead] = useMarkAllReadMutation();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const knownNotifications = notifications.filter((n) => n.type in NOTIFICATION_TYPE_CONFIG);
  const unreadCount = knownNotifications.filter((n) => !n.is_read).length;

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button className={styles.bell} onClick={handleToggle} aria-label="Notifications">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {isOpen && <NotificationPanel notifications={knownNotifications} userId={userId} onMarkAllRead={markAllRead} onClose={() => setIsOpen(false)} />}
    </div>
  );
};
