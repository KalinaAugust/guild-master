import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Mail, Calendar, User } from 'lucide-react';
import { createClient } from '@/shared/api/supabase/server';
import { AvatarUpload } from '@/features/update-profile-avatar';
import { EditableName } from '@/features/update-profile-name';
import { resolvePrivacy, resolveDisplayName, type SocialLink } from '@/entities/user';
import { OwnProfileSettings } from './OwnProfileClient';
import { NameWithIcon, AboutBlock, InterestsBlock, SocialsBlock } from './ProfileBlocks';
import styles from './OwnProfile.module.css';

interface OwnProfileProps {
  user: SupabaseUser;
}

export async function OwnProfile({ user }: OwnProfileProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url, full_name, alias, display_as_alias, icon, about, interests, socials, privacy')
    .eq('id', user.id)
    .single();

  const { data: memberGuilds } = await supabase
    .from('guild_members')
    .select('guild_id')
    .eq('user_id', user.id);

  const guildIds = memberGuilds?.map((m) => m.guild_id) || [];

  const { count: guildsCount } = await supabase
    .from('guild_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: eventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .in('guild_id', guildIds);

  const displayName = resolveDisplayName({
    fullName: profile?.full_name ?? null,
    alias: profile?.alias ?? null,
    displayAsAlias: profile?.display_as_alias ?? false,
  });

  const settingsInitial = {
    alias: profile?.alias ?? null,
    displayAsAlias: profile?.display_as_alias ?? false,
    icon: profile?.icon ?? null,
    about: profile?.about ?? null,
    interests: (profile?.interests as string[]) ?? [],
    socials: (profile?.socials as unknown as SocialLink[]) ?? [],
    privacy: resolvePrivacy(profile?.privacy as Parameters<typeof resolvePrivacy>[0]),
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.headerTop}>
          <OwnProfileSettings initial={settingsInitial} />
        </div>

        <div className={styles.header}>
          <AvatarUpload initialAvatarUrl={profile?.avatar_url || null} userId={user.id} />
          <div className={styles.titleInfo}>
            <h1>
              <NameWithIcon
                name={displayName ?? user.email?.split('@')[0] ?? 'User Profile'}
                icon={profile?.icon ?? null}
              />
            </h1>
            <p className={styles.status}>Active Member</p>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <User className={styles.icon} size={20} />
            <div className={styles.infoContent}>
              <label>Name</label>
              <EditableName initialFullName={profile?.full_name ?? null} userId={user.id} />
            </div>
          </div>
          <div className={styles.infoItem}>
            <Mail className={styles.icon} size={20} />
            <div>
              <label>Email</label>
              <p>{user.email}</p>
            </div>
          </div>
          <div className={styles.infoItem}>
            <Calendar className={styles.icon} size={20} />
            <div>
              <label>Joined</label>
              <p>{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {profile?.about && <AboutBlock about={profile.about} />}
        {Array.isArray(profile?.interests) && profile.interests.length > 0 && (
          <InterestsBlock interests={profile.interests as string[]} />
        )}
        {Array.isArray(profile?.socials) && (profile.socials as unknown as SocialLink[]).length > 0 && (
          <SocialsBlock socials={profile.socials as unknown as SocialLink[]} />
        )}

        <div className={styles.placeholderSection}>
          <h2>Statistics</h2>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{guildsCount || 0}</span>
              <span className={styles.statLabel}>Guilds</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{eventsCount || 0}</span>
              <span className={styles.statLabel}>Events</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
