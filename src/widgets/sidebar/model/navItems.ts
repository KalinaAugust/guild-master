import { Users, Calendar, MessagesSquare, Megaphone, Swords, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  badge?: number;
}

export const navItems: NavItem[] = [
  { href: '/', icon: Calendar, labelKey: 'Common.calendar' },
  { href: '/guild-chat', icon: MessagesSquare, labelKey: 'Common.guildChat' },
  { href: '/announcements', icon: Megaphone, labelKey: 'Common.announcements' },
  { href: '/call-to-action', icon: Swords, labelKey: 'Common.callToAction' },
  { href: '/guilds', icon: Users, labelKey: 'Guild.title' },
];
