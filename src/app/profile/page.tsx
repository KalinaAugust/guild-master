import { createClient } from '@/shared/api/supabase/server';
import { AvatarUpload } from '@/features/update-profile-avatar';
import { EditableName } from '@/features/update-profile-name';
import styles from './ProfilePage.module.css';
import { Mail, Calendar, User } from 'lucide-react';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Access Denied</h1>
          <p>Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_url, full_name')
    .eq('id', user.id)
    .single();

  // Fetch real counts
  const { data: memberGuilds } = await supabase
    .from('guild_members')
    .select('guild_id')
    .eq('user_id', user.id);

  const guildIds = memberGuilds?.map(m => m.guild_id) || [];

  const { count: guildsCount } = await supabase
    .from('guild_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: eventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .in('guild_id', guildIds);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <AvatarUpload 
            initialAvatarUrl={profile?.avatar_url || null} 
            userId={user.id} 
          />
          <div className={styles.titleInfo}>
            <h1>{user.email?.split('@')[0] || 'User Profile'}</h1>
            <p className={styles.status}>Active Member</p>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <User className={styles.icon} size={20} />
            <div>
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
