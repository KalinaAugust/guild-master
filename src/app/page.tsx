import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getMyGuilds } from '@/entities/guild';
import { CalendarGrid } from '@/widgets/calendar';
import { EventModal } from '@/features/create-event';
import styles from './HomePage.module.css';

export default async function Home() {
  const guilds = await getMyGuilds();
  const t = await getTranslations('Common');

  if (guilds.length === 0) {
    redirect('/guilds/create');
  }

  // Для простоты берем первую гильдию. В будущем можно добавить селектор.
  const currentGuildId = guilds[0].id;

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>{t('title')}</h1>
      <CalendarGrid guildId={currentGuildId} />
      <EventModal guildId={currentGuildId} />
    </main>
  );
}
