'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Input } from '@/shared/ui/Input';
import { ensureTrailingSlot } from '../model/options';
import styles from './PollOptionsField.module.css';

interface PollOptionsFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export const PollOptionsField: React.FC<PollOptionsFieldProps> = ({ value, onChange }) => {
  const t = useTranslations('GuildPoll');

  const handleChange = (index: number, next: string) => {
    onChange(ensureTrailingSlot(value.map((o, i) => (i === index ? next : o))));
  };

  const handleRemove = (index: number) => {
    const next = value.filter((_, i) => i !== index);
    onChange(ensureTrailingSlot(next.length ? next : ['']));
  };

  const lastIndex = value.length - 1;

  return (
    <div className={styles.field}>
      <span className={styles.label}>{t('optionsLabel')}</span>
      <ul className={styles.list}>
        {value.map((option, index) => {
          const isTrailingEmpty = index === lastIndex && option.trim() === '';
          return (
            <li key={index} className={styles.row}>
              <Input
                type="text"
                value={option}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder={
                  isTrailingEmpty
                    ? t('addOptionPlaceholder')
                    : t('optionPlaceholder', { index: index + 1 })
                }
                className={styles.input}
              />
              {!isTrailingEmpty && (
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => handleRemove(index)}
                  aria-label={t('removeOption')}
                >
                  <X size={16} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
