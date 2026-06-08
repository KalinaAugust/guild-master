import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
  dot?: boolean;
}

export const SidebarItem = ({ href, icon: Icon, label, active, badge, dot }: SidebarItemProps) => (
  <Link href={href} className={`${styles.item} ${active ? styles.active : ''}`}>
    <span className={styles.iconWrap}>
      <Icon size={22} className={styles.icon} />
      {dot ? <span className={styles.dot} aria-label="unread" /> : null}
    </span>
    <span className={styles.label}>{label}</span>
    {badge ? <span className={styles.badge}>{badge}</span> : null}
  </Link>
);
