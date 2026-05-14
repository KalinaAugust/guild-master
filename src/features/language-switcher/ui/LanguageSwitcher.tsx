'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Select } from '@/shared/ui/Select';
import { setUserLocale } from '../api/setLocale';
import { useTransition } from 'react';

export const LanguageSwitcher = () => {
  const locale = useLocale();
  const t = useTranslations('Common');
  const [isPending, startTransition] = useTransition();

  const options = [
    { 
      label: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '0.75rem' }}>🇺🇸</span>
          {t('locales.en')}
        </div>
      ), 
      value: 'en' 
    },
    { 
      label: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '0.75rem' }}>🇷🇺</span>
          {t('locales.ru')}
        </div>
      ), 
      value: 'ru' 
    }
  ];

  const handleValueChange = (value: string) => {
    startTransition(() => {
      setUserLocale(value);
    });
  };

  return (
    <div style={{ width: '140px', opacity: isPending ? 0.5 : 1 }}>
      <Select 
        value={locale} 
        onValueChange={handleValueChange} 
        options={options} 
      />
    </div>
  );
};

