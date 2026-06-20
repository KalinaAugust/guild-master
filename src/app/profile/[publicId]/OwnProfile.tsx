import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Mail, User, FileText, Cake, VenetianMask } from 'lucide-react';
import { getLocale } from 'next-intl/server';
import { createClient } from '@/shared/api/supabase/server';
import { AvatarUpload } from '@/features/update-profile/avatar';
import { EditableName } from '@/features/update-profile/name';
import { EditableAbout } from '@/features/update-profile/about';
import { EditableBirthDate } from '@/features/update-profile/birth-date';
import { EditableAlias } from '@/features/update-profile/alias';
import { resolvePrivacy, resolveDisplayName, type SocialLink } from '@/entities/user';
import { GradientTitle } from '@/shared/ui/GradientTitle';
import { OwnProfileSettings, EditableInterestsBlock } from './OwnProfileClient';
import {
  NameWithIcon,
  ProfileBlock,
  ProfileStatus,
  ValueBlock,
  SocialsBlock,
} from './ProfileBlocks';
import styles from './OwnProfile.module.css';

interface OwnProfileProps {
  user: SupabaseUser;
}

export async function OwnProfile({ user }: OwnProfileProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url, full_name, alias, display_as_alias, icon, about, interests, socials, birth_date, birth_date_show_year, privacy')
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
    birthDateShowYear: profile?.birth_date_show_year ?? true,
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
          <GradientTitle className={styles.name} fontSize="20px">
            <NameWithIcon
              name={displayName ?? user.email?.split('@')[0] ?? 'User Profile'}
              icon={profile?.icon ?? null}
            />
          </GradientTitle>
          <ProfileStatus online locale={locale} />

          {Array.isArray(profile?.socials) && (profile.socials as unknown as SocialLink[]).length > 0 && (
            <SocialsBlock socials={profile.socials as unknown as SocialLink[]} />
          )}
        </aside>

        <section className={styles.main}>
          <ProfileBlock icon={User} title="Name">
            <EditableName initialFullName={profile?.full_name ?? null} userId={user.id} />
          </ProfileBlock>
          <ProfileBlock icon={VenetianMask} title="Alias">
            <EditableAlias initialAlias={profile?.alias ?? null} userId={user.id} />
          </ProfileBlock>
          <ProfileBlock icon={FileText} title="About">
            <EditableAbout initialAbout={profile?.about ?? null} userId={user.id} />
          </ProfileBlock>
          <EditableInterestsBlock
            initialInterests={(profile?.interests as string[]) ?? []}
            userId={user.id}
          />
          <ValueBlock icon={Mail} title="Email" value={user.email} />

          <ProfileBlock icon={Cake} title="Birth date">
            <EditableBirthDate
              initialBirthDate={profile?.birth_date ?? null}
              birthDateShowYear={profile?.birth_date_show_year ?? true}
              userId={user.id}
              locale={locale}
            />
          </ProfileBlock>
        </section>
      </div>
    </div>
  );
}
