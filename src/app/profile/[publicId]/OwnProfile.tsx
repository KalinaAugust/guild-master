import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Mail, Calendar, User } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/shared/api/supabase/server';
import { AvatarUpload } from '@/features/update-profile-avatar';
import { EditableName } from '@/features/update-profile-name';
import { resolvePrivacy, resolveDisplayName, type SocialLink } from '@/entities/user';
import dayjs from '@/shared/lib/dayjs';
import { GradientTitle } from '@/shared/ui/GradientTitle';
import { OwnProfileSettings } from './OwnProfileClient';
import {
  NameWithIcon,
  ProfileBlock,
  ValueBlock,
  AboutBlock,
  InterestsBlock,
  SocialsBlock,
  BirthDateBlock,
} from './ProfileBlocks';
import styles from './OwnProfile.module.css';

interface OwnProfileProps {
  user: SupabaseUser;
}

export async function OwnProfile({ user }: OwnProfileProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url, full_name, alias, display_as_alias, icon, about, interests, socials, birth_date, privacy')
    .eq('id', user.id)
    .single();

  const displayName = resolveDisplayName({
    fullName: profile?.full_name ?? null,
    alias: profile?.alias ?? null,
    displayAsAlias: profile?.display_as_alias ?? false,
  });

  const locale = await getLocale();

  const settingsInitial = {
    alias: profile?.alias ?? null,
    displayAsAlias: profile?.display_as_alias ?? false,
    icon: profile?.icon ?? null,
    birthDate: profile?.birth_date ?? null,
    about: profile?.about ?? null,
    interests: (profile?.interests as string[]) ?? [],
    socials: (profile?.socials as unknown as SocialLink[]) ?? [],
    privacy: resolvePrivacy(profile?.privacy as Parameters<typeof resolvePrivacy>[0]),
  };

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.headerTop}>
            <OwnProfileSettings initial={settingsInitial} />
          </div>

          <div className={styles.avatarWrap}>
            <AvatarUpload initialAvatarUrl={profile?.avatar_url || null} userId={user.id} />
          </div>
          <GradientTitle className={styles.name} fontSize="1.6rem">
            <NameWithIcon
              name={displayName ?? user.email?.split('@')[0] ?? 'User Profile'}
              icon={profile?.icon ?? null}
            />
          </GradientTitle>
          <p className={styles.status}>Active Member</p>

          {Array.isArray(profile?.socials) && (profile.socials as unknown as SocialLink[]).length > 0 && (
            <SocialsBlock socials={profile.socials as unknown as SocialLink[]} />
          )}
        </aside>

        <section className={styles.main}>
          <ProfileBlock icon={User} title="Name">
            <EditableName initialFullName={profile?.full_name ?? null} userId={user.id} />
          </ProfileBlock>
          <ValueBlock icon={Mail} title="Email" value={user.email} />
          <ValueBlock
            icon={Calendar}
            title="Joined"
            value={dayjs(user.created_at).locale(locale).format('D MMMM YYYY')}
          />

          {profile?.about && <AboutBlock about={profile.about} />}
          {Array.isArray(profile?.interests) && profile.interests.length > 0 && (
            <InterestsBlock interests={profile.interests as string[]} />
          )}
          {profile?.birth_date && <BirthDateBlock birthDate={profile.birth_date} locale={locale} />}
        </section>
      </div>
    </div>
  );
}
