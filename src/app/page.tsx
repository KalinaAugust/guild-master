import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { getUser } from '@/entities/user';
import { getServerEvents } from '@/entities/event';
import { CalendarGrid } from '@/widgets/calendar';
import { EventWizard } from '@/features/create-event';
import { UpcomingEventsStrip } from '@/widgets/upcoming-events';
import styles from './HomePage.module.css';

export default async function Home() {
  const user = await getUser();
  const guilds = await getMyGuilds(user?.id);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const lastActiveGuildId = user?.profile?.lastActiveGuildId;
  const defaultGuildId = lastActiveGuildId && guilds.some(g => g.id === lastActiveGuildId)
    ? lastActiveGuildId
    : guilds[0].id;
  const initialEvents = await getServerEvents(defaultGuildId);

  return (
    <main className={styles.main}>
      <UpcomingEventsStrip guilds={guilds} userId={user?.id} initialEvents={initialEvents} initialGuildId={defaultGuildId} />
      <CalendarGrid guilds={guilds} userId={user?.id} initialEvents={initialEvents} initialGuildId={defaultGuildId} />
      <EventWizard userId={user?.id} />
    </main>
  );
}
