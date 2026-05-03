import { redirect } from 'next/navigation';
import { getMyGuilds } from '@/entities/guild';
import { CalendarGrid } from '@/widgets/calendar';
import { CreateEventModal } from '@/features/create-event';

export default async function Home() {
  const guilds = await getMyGuilds();

  if (guilds.length === 0) {
    redirect('/guilds/create');
  }

  // Для простоты берем первую гильдию. В будущем можно добавить селектор.
  const currentGuildId = guilds[0].id;

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
      <h1 style={{ marginBottom: '20px' }}>Guild Master</h1>
      <CalendarGrid guildId={currentGuildId} />
      <CreateEventModal guildId={currentGuildId} />
    </main>
  );
}
