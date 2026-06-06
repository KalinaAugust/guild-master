import Link from 'next/link';
import { getMyGuilds } from '@/entities/guild';
import { redirect } from 'next/navigation';
import { DayEventsList } from '@/widgets/day-events';
import { EventWizard } from '@/features/create-event';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getUser } from '@/entities/user/api/getUser';
import styles from './DayPage.module.css';

interface DayPageProps {
  params: Promise<{
    date: string;
  }>;
  searchParams: Promise<{
    guildId?: string;
  }>;
}

export default async function DayPage({ params, searchParams }: DayPageProps) {
  const { date } = await params;
  const { guildId } = await searchParams;

  const user = await getUser();
  const guilds = await getMyGuilds(user?.id);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const lastActiveGuildId = user?.profile?.lastActiveGuildId;
  const defaultGuild = lastActiveGuildId && guilds.some(g => g.id === lastActiveGuildId)
    ? guilds.find(g => g.id === lastActiveGuildId) || guilds[0]
    : guilds[0];

  const activeGuild = guilds.find((g) => g.id === guildId) || defaultGuild;
  const currentGuildId = activeGuild.id;
  const t = await getTranslations('Common');

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.backLink}>
        <ChevronLeft size={20} />
        {t('backToCalendar')}
      </Link>

      <DayEventsList date={date} guildId={currentGuildId} userId={user?.id} />

      <EventWizard isDayView userId={user?.id} />
    </main>
  );
}
