import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import styles from './Sidebar.module.css';

interface SidebarItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
}

export const SidebarItem = ({ href, icon: Icon, label, active, badge }: SidebarItemProps) => (
  <Link href={href} className={`${styles.item} ${active ? styles.active : ''}`}>
    <Icon size={22} className={styles.icon} />
    <span className={styles.label}>{label}</span>
    {badge ? <span className={styles.badge}>{badge}</span> : null}
  </Link>
);
