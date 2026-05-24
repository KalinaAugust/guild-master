import { redirect } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';
import { GuildManagePage } from '@/features/manage-guilds';

export default async function GuildsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main>
      <GuildManagePage userId={user.id} />
    </main>
  );
}
