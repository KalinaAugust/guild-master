import { Users, Calendar, MessagesSquare, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  badge?: number;
}

export const navItems: NavItem[] = [
  { href: '/', icon: Calendar, labelKey: 'Common.calendar' },
  { href: '/guild-chat', icon: MessagesSquare, labelKey: 'Common.guildChat' },
  { href: '/guilds', icon: Users, labelKey: 'Guild.title' },
];
