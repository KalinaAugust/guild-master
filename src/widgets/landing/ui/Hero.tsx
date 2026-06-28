import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './Hero.module.css';

export const Hero = () => {
  const t = useTranslations('Landing');
  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>{t('hero.title')}</h1>
      <p className={styles.subtitle}>{t('hero.subtitle')}</p>
      <Link href="/login" className={styles.cta}>{t('hero.cta')}</Link>
    </section>
  );
};
