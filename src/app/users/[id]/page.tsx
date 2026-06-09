import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { Calendar } from 'lucide-react';
import { getPublicProfile } from '@/entities/user/api/getPublicProfile';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import styles from './PublicProfilePage.module.css';

interface PublicProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  const name = profile?.fullName;
  return { title: name ? `${name} — Guild Master` : 'Guild Master' };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) notFound();

  const t = await getTranslations('PublicProfile');
  const locale = await getLocale();
  const showStats = profile.guildsCount !== null && profile.eventsCount !== null;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <UserAvatar avatarUrl={profile.avatarUrl} name={profile.fullName} size="xl" />
          <h1 className={styles.name}>{profile.fullName || 'Guild Master user'}</h1>
        </div>

        {profile.joinedAt && (
          <div className={styles.infoItem}>
            <Calendar className={styles.icon} size={20} />
            <div>
              <span className={styles.infoLabel}>{t('joined')}</span>
              <p>{new Date(profile.joinedAt).toLocaleDateString(locale)}</p>
            </div>
          </div>
        )}

        {showStats && (
          <div className={styles.statsSection}>
            <h2>{t('statistics')}</h2>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{profile.guildsCount}</span>
                <span className={styles.statLabel}>{t('guilds')}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{profile.eventsCount}</span>
                <span className={styles.statLabel}>{t('events')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
