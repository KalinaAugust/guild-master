import { redirect } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';
import { GuildManagePage, PendingInvitesList } from '@/features/manage-guilds';
import { getPendingInvites } from '@/entities/guild/api/invites';
import styles from './GuildsPage.module.css';

export default async function GuildsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const pendingInvites = await getPendingInvites();

  return (
    <main className={styles.main}>
      <GuildManagePage userId={user.id} pendingInvites={pendingInvites} />
    </main>
  );
}
