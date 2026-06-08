'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { MAX_POLL_OPTIONS } from '../model/options';
import styles from './PollOptionsField.module.css';

interface PollOptionsFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export const PollOptionsField: React.FC<PollOptionsFieldProps> = ({ value, onChange }) => {
  const t = useTranslations('GuildPoll');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const focusIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (focusIndexRef.current !== null) {
      inputsRef.current[focusIndexRef.current]?.focus();
      focusIndexRef.current = null;
    }
  });

  const handleChange = (index: number, next: string) => {
    onChange(value.map((o, i) => (i === index ? next : o)));
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    focusIndexRef.current = value.length;
    onChange([...value, '']);
  };

  return (
    <div className={styles.field}>
      <span className={styles.label}>{t('optionsLabel')}</span>

      {value.length > 0 && (
        <ul className={styles.list}>
          {value.map((option, index) => (
            <li key={index} className={styles.row}>
              <Input
                ref={(el) => {
                  inputsRef.current[index] = el;
                }}
                type="text"
                value={option}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder={t('optionPlaceholder', { index: index + 1 })}
                className={styles.input}
              />
              <button
                type="button"
                className={styles.remove}
                onClick={() => handleRemove(index)}
                aria-label={t('removeOption')}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length < MAX_POLL_OPTIONS && (
        <button type="button" className={styles.addButton} onClick={handleAdd}>
          <Plus size={16} />
          {t('addOptionButton')}
        </button>
      )}
    </div>
  );
};
