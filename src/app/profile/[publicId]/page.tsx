import { notFound } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { Calendar, Mail } from 'lucide-react';
import { getPublicProfile } from '@/entities/user/api/getPublicProfile';
import { buildVisibleProfile, type ViewerRelationship } from '@/entities/user';
import { getCommonGuilds } from '@/entities/guild';
import { createClient } from '@/shared/api/supabase/server';
import dayjs from '@/shared/lib/dayjs';
import { UserAvatar } from '@/shared/ui/UserAvatar';
import { GradientTitle } from '@/shared/ui/GradientTitle';
import { OwnProfile } from './OwnProfile';
import {
  NameWithIcon,
  ProfileStatus,
  isOnline,
  ValueBlock,
  AboutBlock,
  InterestsBlock,
  SocialsBlock,
  SendMessageButton,
  BirthDateBlock,
  CommonGuildsBlock,
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
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.avatarWrap}>
            <UserAvatar avatarUrl={profile.avatarUrl} name={profile.displayName} fill />
          </div>
          <GradientTitle className={styles.name} fontSize="1.3rem">
            <NameWithIcon name={profile.displayName} icon={profile.icon} />
          </GradientTitle>
          {profile.alias && profile.alias !== profile.displayName && (
            <p className={styles.alias}>{profile.alias}</p>
          )}
          {profile.realName && profile.realName !== profile.displayName && (
            <p className={styles.realName}>{profile.realName}</p>
          )}
          <ProfileStatus online={isOnline(profile.lastSeenAt)} lastSeenAt={profile.lastSeenAt} locale={locale} />

          {viewer && <SendMessageButton />}

          {profile.socials && profile.socials.length > 0 && (
            <SocialsBlock socials={profile.socials} />
          )}
        </aside>

        <section className={styles.main}>
          {profile.commonGuilds && <CommonGuildsBlock guilds={profile.commonGuilds} />}
          {profile.about && <AboutBlock about={profile.about} />}
          {profile.interests && profile.interests.length > 0 && (
            <InterestsBlock interests={profile.interests} />
          )}
          {profile.birthDate && <BirthDateBlock birthDate={profile.birthDate} locale={locale} />}

          {profile.email && <ValueBlock icon={Mail} title={t('email')} value={profile.email} />}

          {profile.joinedAt && (
            <ValueBlock
              icon={Calendar}
              title={t('joined')}
              value={dayjs(profile.joinedAt).locale(locale).format('D MMMM YYYY')}
            />
          )}
        </section>
      </div>
    </div>
  );
}
