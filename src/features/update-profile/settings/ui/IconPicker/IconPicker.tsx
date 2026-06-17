'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import * as Icons from 'lucide-react';
import { PROFILE_ICONS, type ProfileIcon } from '@/entities/user';
import styles from './IconPicker.module.css';

interface IconPickerProps {
  value: string | null;
  onChange: (icon: ProfileIcon | null) => void;
}

export const IconPicker = ({ value, onChange }: IconPickerProps) => {
  const t = useTranslations('UpdateProfile');
  return (
    <div className={styles.grid}>
      <button
        type="button"
        aria-label={t('settings.noIcon')}
        aria-pressed={!value}
        className={!value ? styles.activeCell : styles.cell}
        onClick={() => onChange(null)}
      >
        <Icons.Ban size={16} />
      </button>
      {PROFILE_ICONS.map((name) => {
        const Icon = Icons[name] as React.ComponentType<{ size?: number }>;
        return (
          <button
            key={name}
            type="button"
            aria-label={name}
            aria-pressed={value === name}
            className={value === name ? styles.activeCell : styles.cell}
            onClick={() => onChange(name)}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
};
