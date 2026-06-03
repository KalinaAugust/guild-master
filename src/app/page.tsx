import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { createClient } from '@/shared/api/supabase/server';
import { CalendarGrid } from '@/widgets/calendar';
import { EventWizard } from '@/features/create-event';
import { UpcomingEventsStrip } from '@/widgets/upcoming-events';
import styles from './HomePage.module.css';

export default async function Home() {
  const supabase = await createClient();
  const [{ data: { user } }, guilds] = await Promise.all([
    supabase.auth.getUser(),
    getMyGuilds(),
  ]);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  return (
    <main className={styles.main}>
      <UpcomingEventsStrip guilds={guilds} userId={user?.id} />
      <CalendarGrid guilds={guilds} userId={user?.id} />
      <EventWizard userId={user?.id} />
    </main>
  );
}
