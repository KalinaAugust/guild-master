import Link from 'next/link';
import { getMyGuilds } from '@/entities/guild';
import { redirect } from 'next/navigation';
import { DayEventsList } from '@/widgets/day-events';
import { EventWizard } from '@/features/create-event';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import styles from './DayPage.module.css';

interface DayPageProps {
  params: Promise<{
    date: string;
  }>;
}

export default async function DayPage({ params }: DayPageProps) {
  const { date } = await params;
  const guilds = await getMyGuilds();
  const t = await getTranslations('Common');

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const currentGuildId = guilds[0].id;

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.backLink}>
        <ChevronLeft size={20} />
        {t('backToCalendar')}
      </Link>

      <div className={styles.card}>
        <DayEventsList date={date} guildId={currentGuildId} />
      </div>

      <EventWizard isDayView />
    </main>
  );
}
