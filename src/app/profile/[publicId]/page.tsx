import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { Calendar } from 'lucide-react';
import { getPublicProfile } from '@/entities/user/api/getPublicProfile';
import { buildVisibleProfile } from '@/entities/user/lib/buildVisibleProfile';
import type { ViewerRelationship } from '@/entities/user';
import { getCommonGuilds } from '@/entities/guild/api/getCommonGuilds';
import { createClient } from '@/shared/api/supabase/server';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { OwnProfile } from './OwnProfile';
import {
  NameWithIcon,
  AboutBlock,
  InterestsBlock,
  SocialsBlock,
  CommonGuildsBlock,
  StatsBlock,
} from './ProfileBlocks';
import styles from './PublicProfilePage.module.css';

interface PublicProfilePageProps {
  params: Promise<{ publicId: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { publicId } = await params;
  const raw = await getPublicProfile(publicId);
  const name = raw?.displayName;
  return { title: name ? `${name} — Guild Master` : 'Guild Master' };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { publicId } = await params;

  const supabase = await createClient();
  const { data: { user: viewer } } = await supabase.auth.getUser();

  const raw = await getPublicProfile(publicId);
  if (!raw) notFound();

  if (viewer && viewer.id === raw.id) {
    return <OwnProfile user={viewer} />;
  }

  const commonGuilds = viewer ? await getCommonGuilds(viewer.id, raw.id) : [];
  const relationship: ViewerRelationship = commonGuilds.length > 0 ? 'guildmate' : 'public';
  const profile = buildVisibleProfile(raw, relationship, commonGuilds);

  const t = await getTranslations('PublicProfile');
  const locale = await getLocale();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <UserAvatar avatarUrl={profile.avatarUrl} name={profile.displayName} size="xl" />
          <h1 className={styles.name}>
            <NameWithIcon name={profile.displayName} icon={profile.icon} />
          </h1>
          {profile.realName && profile.realName !== profile.displayName && (
            <p className={styles.realName}>{profile.realName}</p>
          )}
        </div>

        {profile.about && <AboutBlock about={profile.about} />}
        {profile.interests && profile.interests.length > 0 && (
          <InterestsBlock interests={profile.interests} />
        )}
        {profile.socials && profile.socials.length > 0 && (
          <SocialsBlock socials={profile.socials} />
        )}
        {profile.commonGuilds && <CommonGuildsBlock guilds={profile.commonGuilds} />}

        {profile.joinedAt && (
          <div className={styles.infoItem}>
            <Calendar className={styles.icon} size={20} />
            <div>
              <span className={styles.infoLabel}>{t('joined')}</span>
              <p>{new Date(profile.joinedAt).toLocaleDateString(locale)}</p>
            </div>
          </div>
        )}

        {profile.guildsCount !== undefined && <StatsBlock profile={profile} />}
      </div>
    </div>
  );
}
