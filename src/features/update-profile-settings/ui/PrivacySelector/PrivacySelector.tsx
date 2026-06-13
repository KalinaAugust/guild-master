'use client';

import { Lock, Users, Globe } from 'lucide-react';
import type { PrivacyLevel } from '@/entities/user';
import { Tooltip } from '@/shared/ui/Tooltip';
import styles from './PrivacySelector.module.css';

const OPTIONS: { level: PrivacyLevel; Icon: typeof Lock; label: string; hint: string }[] = [
  { level: 'private', Icon: Lock, label: 'Only me', hint: 'Only me — visible to you alone' },
  { level: 'guildmates', Icon: Users, label: 'Guild mates', hint: 'Guild mates — visible to members of your guilds' },
  { level: 'public', Icon: Globe, label: 'Everyone', hint: 'Everyone — visible to anyone' },
];

interface PrivacySelectorProps {
  value: PrivacyLevel;
  onChange: (level: PrivacyLevel) => void;
}

export const PrivacySelector = ({ value, onChange }: PrivacySelectorProps) => (
  <div className={styles.group} role="group">
    {OPTIONS.map(({ level, Icon, label, hint }) => (
      <Tooltip key={level} content={hint}>
        <button
          type="button"
          aria-label={label}
          aria-pressed={value === level}
          className={value === level ? styles.activeOption : styles.option}
          onClick={() => onChange(level)}
        >
          <Icon size={16} />
        </button>
      </Tooltip>
    ))}
  </div>
);
