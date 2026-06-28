import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './LandingFooter.module.css';

export const LandingFooter = () => (
  <footer className={styles.footer}>
    <span className={styles.copyright}>
      © {new Date().getFullYear()}{' '}
      <a href="https://t.me/KalinaAugust" target="_blank" rel="noopener noreferrer" className={styles.link}>Denis Kalinin</a>
      . All rights reserved.
    </span>
    <LanguageSwitcher />
  </footer>
);
