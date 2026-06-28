'use client';

import { usePathname } from 'next/navigation';
import styles from './Layout.module.css';

export const CopyrightFooter = () => {
  const pathname = usePathname();

  if (pathname !== '/home') return null;

  return (
    <footer className={styles.copyright}>
      © {new Date().getFullYear()}{' '}
      <a
        href="https://t.me/KalinaAugust"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.copyrightLink}
      >
        Denis Kalinin
      </a>
      . All rights reserved.
    </footer>
  );
};
