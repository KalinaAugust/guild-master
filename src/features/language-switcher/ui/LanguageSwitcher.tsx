'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Select } from '@/shared/ui/Select';
import { setUserLocale } from '../api/setLocale';
import { useTransition } from 'react';
import styles from './LanguageSwitcher.module.css';

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const t = useTranslations('Common');
  const [isPending, startTransition] = useTransition();

  const options = [
    {
      label: (
        <div className={styles.option}>
          <span className={styles.flag}>🇺🇸</span>
          {t('locales.en')}
        </div>
      ),
      value: 'en'
    },
    {
      label: (
        <div className={styles.option}>
          <span className={styles.flag}>🇷🇺</span>
          {t('locales.ru')}
        </div>
      ),
      value: 'ru'
    }
  ];

  const handleValueChange = (value: string) => {
    startTransition(async () => {
      await setUserLocale(value);
    });
  };

  return (
    <div className={`${styles.wrapper} ${isPending ? styles.wrapper_pending : ''}`}>
      <Select
        value={locale}
        onValueChange={handleValueChange}
        options={options}
      />
    </div>
  );
};

