import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './FinalCta.module.css';

export const FinalCta = () => {
  const t = useTranslations('Landing');
  return (
    <section className={styles.finalCta}>
      <h2 className={styles.title}>{t('finalCta.title')}</h2>
      <Link href="/login" className={styles.cta}>{t('finalCta.cta')}</Link>
    </section>
  );
};
