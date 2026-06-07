import { Users, Calendar, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  /** Full next-intl key, resolved via the root translator, e.g. "Guild.title". */
  labelKey: string;
  /** Optional numeric badge; unused for now, kept for future items. */
  badge?: number;
}

export const navItems: NavItem[] = [
  { href: '/', icon: Calendar, labelKey: 'Common.calendar' },
  { href: '/guilds', icon: Users, labelKey: 'Guild.title' },
];
