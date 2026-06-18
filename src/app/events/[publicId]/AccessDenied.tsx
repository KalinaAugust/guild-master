import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import styles from './EventPage.module.css';

interface AccessDeniedProps {
  ownerName: string | null;
}

export async function AccessDenied({ ownerName }: AccessDeniedProps) {
  const t = await getTranslations('EventDetail');

  return (
    <div className={styles.accessDeniedContainer}>
      <h1 className={styles.accessDeniedTitle}>{t('accessDenied')}</h1>
      {ownerName && (
        <p className={styles.accessDeniedMessage}>
          {t('guildLeaderContact', { name: ownerName })}
        </p>
      )}
      <Link href="/" className={styles.homeLink}>
        {t('goHome')}
      </Link>
    </div>
  );
}
