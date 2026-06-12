'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './Header.module.css';

/** Guest "Login" action — hidden on the login page itself, where it makes no sense. */
export const HeaderAuthLink = () => {
  const pathname = usePathname();
  const t = useTranslations('Auth');

  if (pathname === '/login' || pathname.endsWith('/login')) return null;

  return (
    <Link href="/login" className={styles.loginLink}>
      <LogIn size={16} aria-hidden />
      <span>{t('login')}</span>
    </Link>
  );
};
