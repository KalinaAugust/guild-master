'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAppSelector } from '@/shared/lib/hooks';
import { skipToken } from '@reduxjs/toolkit/query';
import { useGetGuildChatUnreadQuery } from '@/entities/guild-message';
import { useGetDmUnreadQuery } from '@/entities/direct-message';
import { useGetAnnouncementsUnreadQuery } from '@/entities/announcement';
import { useGetCallToActionsUnreadQuery } from '@/entities/call-to-action';
import { useGetGuildsQuery, useGetPendingInvitesQuery } from '@/entities/guild';
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
  const { data: chatUnread } = useGetGuildChatUnreadQuery(
    activeGuildId ? { guildId: activeGuildId, scope: 'all' } : skipToken,
    pollOptions
  );
  const { data: dmUnread } = useGetDmUnreadQuery(undefined, { pollingInterval: 60_000, skipPollingIfUnfocused: true });
  const { data: announcementsUnread } = useGetAnnouncementsUnreadQuery(activeGuildId ?? '', pollOptions);
  const { data: ctaUnread } = useGetCallToActionsUnreadQuery(activeGuildId ?? '', pollOptions);
  const { data: guilds } = useGetGuildsQuery(undefined, {
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });
  const { data: pendingInvites } = useGetPendingInvitesQuery(undefined, {
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });

  const activeGuild = guilds?.find((g) => g.id === activeGuildId);
  const isOfficer = activeGuild?.role === 'ADMIN' || activeGuild?.role === 'OWNER';
  const { data: officerChatUnread } = useGetGuildChatUnreadQuery(
    isOfficer && activeGuildId ? { guildId: activeGuildId, scope: 'officers' } : skipToken,
    pollOptions,
  );

  // Pending join requests in any owned guild signal that guilds need attention.
  const ownedGuildsNeedAttention = !!guilds?.some((g) => (g.pendingRequestCount ?? 0) > 0);
  const userHasPendingInvites = !!pendingInvites && pendingInvites.length > 0;
  const guildsNeedAttention = ownedGuildsNeedAttention || userHasPendingInvites;

  // Per-route unread flags; the dot hides on the route it points to.
  const unreadByHref: Record<string, boolean | undefined> = {
    '/guild-chat': chatUnread?.hasUnread || officerChatUnread?.hasUnread || dmUnread?.hasUnread,
    '/announcements': announcementsUnread?.hasUnread,
    '/looking-for-group': ctaUnread?.hasUnread,
    '/guilds': guildsNeedAttention,
  };

  return (
    <nav className={styles.sidebar} aria-label="Main navigation">
      <ul className={styles.list}>
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/home' && pathname.startsWith(`${item.href}/`));
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
