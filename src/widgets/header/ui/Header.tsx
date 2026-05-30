import { createClient } from '@/shared/api/supabase/server';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { UserMenu } from './UserMenu';
import { AiHelperButton } from '@/features/ai-helper';
import styles from './Header.module.css';

export const Header = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations('Common');
  const authT = await getTranslations('Auth');

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <span className={styles.logoText}>{t('title')}</span>
        <Shield size={22} className={styles.logoIcon} />
      </Link>
      <nav className={styles.nav}>
        {user ? (
          <>
            <AiHelperButton />
            <UserMenu email={user.email} />
          </>
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
