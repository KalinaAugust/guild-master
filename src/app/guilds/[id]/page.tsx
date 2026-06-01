import { notFound } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';
import { GuildDetailContent, type MembershipStatus } from '@/features/guild-detail';
import { GuildEditWizardConnected } from '@/features/manage-guilds';
import styles from './GuildDetailPage.module.css';

interface GuildDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function GuildDetailPage({ params }: GuildDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: guild } = await supabase
    .from('guilds')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (!guild) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  let membershipStatus: MembershipStatus = 'guest';

  if (user) {
    const { data: membership } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership?.role === 'OWNER') {
      membershipStatus = 'owner';
    } else if (membership) {
      membershipStatus = 'member';
    } else {
      const { data: pendingRequest } = await supabase
        .from('guild_join_requests')
        .select('id')
        .eq('guild_id', id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      membershipStatus = pendingRequest ? 'pending' : 'none';
    }
  }

  return (
    <main className={styles.main}>
      <GuildDetailContent guildId={id} initialMembershipStatus={membershipStatus} />
      {membershipStatus === 'owner' && user && (
        <GuildEditWizardConnected userId={user.id} />
      )}
    </main>
  );
}
