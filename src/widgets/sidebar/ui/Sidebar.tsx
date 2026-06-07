'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
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

  return (
    <nav className={styles.sidebar} aria-label="Main navigation">
      <ul className={styles.list}>
        {navItems.map((item) => (
          <li key={item.href}>
            <SidebarItem
              href={item.href}
              icon={item.icon}
              label={t(item.labelKey)}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              badge={item.badge}
            />
          </li>
        ))}
      </ul>
      {footer && <div className={styles.footer}>{footer}</div>}
    </nav>
  );
};
