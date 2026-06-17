import { getUser } from '@/entities/user/api/getUser';
import { AiHelperButton } from '@/features/ai-helper';
import { NotificationBell } from '@/features/notification-panel';
import { HeaderAuthLink } from './HeaderAuthLink';
import styles from './Header.module.css';

export const Header = async () => {
  const user = await getUser();

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        {user ? (
          <>
            <AiHelperButton />
            <NotificationBell userId={user.id} />
          </>
        ) : (
          <div className={styles.authLinks}>
            <HeaderAuthLink />
          </div>
        )}
      </nav>
    </header>
  );
};
