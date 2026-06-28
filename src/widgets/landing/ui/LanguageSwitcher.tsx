'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { setUserLocale } from '@/features/language-switcher';
import styles from './LanguageSwitcher.module.css';

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: string) => {
    if (next === locale || isPending) return;
    startTransition(() => { setUserLocale(next); });
  };

  return (
    <div className={styles.switcher}>
      <button type="button" onClick={() => switchTo('en')} aria-pressed={locale === 'en'}
        className={locale === 'en' ? styles.active : styles.option}>EN</button>
      <button type="button" onClick={() => switchTo('ru')} aria-pressed={locale === 'ru'}
        className={locale === 'ru' ? styles.active : styles.option}>RU</button>
    </div>
  );
};
