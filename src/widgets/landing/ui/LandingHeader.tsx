import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './LandingHeader.module.css';

export const LandingHeader = () => {
  const t = useTranslations('Landing');
  return (
    <header className={styles.header}>
      <span className={styles.logo}>Guild Master</span>
      <nav className={styles.nav}>
        <LanguageSwitcher />
        <Link href="/login" className={styles.loginLink}>{t('nav.login')}</Link>
      </nav>
    </header>
  );
};
