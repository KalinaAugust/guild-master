import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { getUser } from '@/entities/user/api/getUser';
import { UpcomingEventsStrip } from '@/widgets/upcoming-events';
import { GuildChat } from '@/widgets/guild-chat';
import { getServerEvents } from '@/entities/event/api/getEvents';
import styles from '../HomePage.module.css';

export default async function GuildChatPage() {
  const user = await getUser();
  const guilds = await getMyGuilds(user?.id);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const lastActiveGuildId = user?.profile?.lastActiveGuildId;
  const defaultGuildId = lastActiveGuildId && guilds.some((g) => g.id === lastActiveGuildId)
    ? lastActiveGuildId
    : guilds[0].id;
  const initialEvents = await getServerEvents(defaultGuildId);

  return (
    <main className={styles.main}>
      <UpcomingEventsStrip guilds={guilds} userId={user?.id} initialEvents={initialEvents} initialGuildId={defaultGuildId} />
      <GuildChat guilds={guilds} userId={user?.id} initialGuildId={defaultGuildId} />
    </main>
  );
}
