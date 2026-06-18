import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';
import { GuildDetailContent, type MembershipStatus } from '@/features/guild-detail';
import { GuildEditWizardConnected } from '@/features/manage-guilds';
import { isUuid } from '@/shared/lib/isUuid';
import styles from './GuildDetailPage.module.css';

interface GuildDetailPageProps {
  params: Promise<{ publicId: string }>;
}

export default async function GuildDetailPage({ params }: GuildDetailPageProps) {
  const { publicId } = await params;
  const supabase = await createClient();

  let guild = null;
  if (isUuid(publicId)) {
    const { data } = await supabase
      .from('guilds')
      .select('id, public_id')
      .eq('id', publicId)
      .maybeSingle();

    if (data) {
      redirect(`/guilds/${data.public_id}`);
    }
  } else {
    const { data } = await supabase
      .from('guilds')
      .select('id, public_id')
      .eq('public_id', publicId)
      .maybeSingle();
    guild = data;
  }

  if (!guild) notFound();

  const id = guild.id; // UUID to query membership and pass to components

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
      <GuildDetailContent guildId={id} initialMembershipStatus={membershipStatus} userId={user?.id} />
      {membershipStatus === 'owner' && user && (
        <GuildEditWizardConnected userId={user.id} />
      )}
    </main>
  );
}
