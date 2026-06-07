import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getUser } from '@/entities/user/api/getUser';
import { AiHelperButton } from '@/features/ai-helper';
import { NotificationBell } from '@/features/notification-panel';
import styles from './Header.module.css';

export const Header = async () => {
  const user = await getUser();
  const authT = await getTranslations('Auth');

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {user ? (
          <>
            <AiHelperButton />
            <NotificationBell />
          </>
        ) : (
          <div className={styles.authLinks}>
            <Link href="/login" className={styles.loginLink}>
              {authT('login')}
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
};
