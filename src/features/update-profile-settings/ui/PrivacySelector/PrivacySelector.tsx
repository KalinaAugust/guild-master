'use client';

import { Lock, Users, Globe } from 'lucide-react';
import type { PrivacyLevel } from '@/entities/user';
import styles from './PrivacySelector.module.css';

const OPTIONS: { level: PrivacyLevel; Icon: typeof Lock; label: string }[] = [
  { level: 'private', Icon: Lock, label: 'Only me' },
  { level: 'guildmates', Icon: Users, label: 'Guild mates' },
  { level: 'public', Icon: Globe, label: 'Everyone' },
];

interface PrivacySelectorProps {
  value: PrivacyLevel;
  onChange: (level: PrivacyLevel) => void;
}

export const PrivacySelector = ({ value, onChange }: PrivacySelectorProps) => (
  <div className={styles.group} role="group">
    {OPTIONS.map(({ level, Icon, label }) => (
      <button
        key={level}
        type="button"
        aria-label={label}
        aria-pressed={value === level}
        className={value === level ? styles.activeOption : styles.option}
        onClick={() => onChange(level)}
      >
        <Icon size={16} />
      </button>
    ))}
  </div>
);
