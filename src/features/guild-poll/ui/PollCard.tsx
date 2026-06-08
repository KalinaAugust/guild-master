'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import styles from './PollCard.module.css';

export const PollCard: React.FC = () => {
  const t = useTranslations('GuildPoll');

  const options = [
    { label: t('placeholderOption1'), percent: 62, fill: styles.fill62 },
    { label: t('placeholderOption2'), percent: 28, fill: styles.fill28 },
    { label: t('placeholderOption3'), percent: 10, fill: styles.fill10 },
  ];

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <span className={styles.badge}>{t('badge')}</span>
        <h3 className={styles.question}>{t('placeholderQuestion')}</h3>
      </header>

      <ul className={styles.options}>
        {options.map((o) => (
          <li key={o.label} className={styles.option}>
            <div className={`${styles.optionFill} ${o.fill}`} />
            <span className={styles.optionLabel}>{o.label}</span>
            <span className={styles.optionPercent}>{o.percent}%</span>
          </li>
        ))}
      </ul>

      <footer className={styles.foot}>{t('placeholderVotes', { count: 24 })}</footer>
    </article>
  );
};
