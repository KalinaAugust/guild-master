'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAppSelector } from '@/shared/lib/hooks';
import { useGetGuildChatUnreadQuery } from '@/entities/guild-message';
import { useGetAnnouncementsUnreadQuery } from '@/entities/announcement';
import { useGetCallToActionsUnreadQuery } from '@/entities/call-to-action';
import { navItems } from '../model/navItems';
import { SidebarItem } from './SidebarItem';
import styles from './Sidebar.module.css';

interface SidebarProps {
  /** Content pinned to the bottom of the rail (e.g. the user menu). */
  footer?: ReactNode;
}

export const Sidebar = ({ footer }: SidebarProps) => {
  const pathname = usePathname();
  const t = useTranslations();
  const activeGuildId = useAppSelector((state) => state.guild.currentGuildId);
  const pollOptions = {
    skip: !activeGuildId,
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  };
  const { data: chatUnread } = useGetGuildChatUnreadQuery(activeGuildId ?? '', pollOptions);
  const { data: announcementsUnread } = useGetAnnouncementsUnreadQuery(activeGuildId ?? '', pollOptions);
  const { data: ctaUnread } = useGetCallToActionsUnreadQuery(activeGuildId ?? '', pollOptions);

  // Per-route unread flags; the dot hides on the route it points to.
  const unreadByHref: Record<string, boolean | undefined> = {
    '/guild-chat': chatUnread?.hasUnread,
    '/announcements': announcementsUnread?.hasUnread,
    '/call-to-action': ctaUnread?.hasUnread,
  };

  return (
    <nav className={styles.sidebar} aria-label="Main navigation">
      <ul className={styles.list}>
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          const dot = !!unreadByHref[item.href] && pathname !== item.href;
          return (
            <li key={item.href}>
              <SidebarItem
                href={item.href}
                icon={item.icon}
                label={t(item.labelKey)}
                active={active}
                badge={item.badge}
                dot={dot}
              />
            </li>
          );
        })}
      </ul>
      {footer && <div className={styles.footer}>{footer}</div>}
    </nav>
  );
};
