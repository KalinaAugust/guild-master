import type { ComponentType, ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip } from '@/shared/ui/Tooltip';
import styles from './ProfileBlock.module.css';

export type BlockIcon = ComponentType<{ size?: number; className?: string }>;

export interface ProfileBlockProps {
  icon: BlockIcon;
  title: string;
  /** When set, renders a help button with this tooltip text next to the title. */
  help?: string;
  children: ReactNode;
}

/**
 * Unified block shell: a glass panel with an icon + title header and a body.
 * Shared by the profile page blocks (Name, Email, About, …) and the private
 * note block so headers, spacing, and the hover-reveal edit chrome stay
 * consistent.
 */
export const ProfileBlock = ({ icon: Icon, title, help, children }: ProfileBlockProps) => (
  <section className={styles.block}>
    <div className={styles.blockHeader}>
      <span className={styles.blockIconTile}>
        <Icon size={16} className={styles.blockIcon} />
      </span>
      <h2 className={styles.blockTitle}>{title}</h2>
      {help && (
        <Tooltip content={help}>
          <button type="button" className={styles.helpButton} aria-label={help}>
            <HelpCircle size={14} className={styles.helpIcon} />
          </button>
        </Tooltip>
      )}
    </div>
    {children}
  </section>
);
