import { createClient } from '@/shared/api/supabase/server';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { UserMenu } from './UserMenu';
import styles from './Header.module.css';

export const Header = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations('Common');
  const authT = await getTranslations('Auth');

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        {t('title')}
      </Link>
      <nav className={styles.nav}>
        {user ? (
          <UserMenu email={user.email} />
        ) : (
          <div className={styles.authLinks}>
            <UserMenu />
            <Link href="/login" className={styles.loginLink}>
              {authT('login')}
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};
