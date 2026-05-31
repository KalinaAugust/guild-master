import Link from 'next/link';
import { getMyGuilds } from '@/entities/guild';
import { redirect } from 'next/navigation';
import { DayEventsList } from '@/widgets/day-events';
import { EventWizard } from '@/features/create-event';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/shared/api/supabase/server';
import styles from './DayPage.module.css';

interface DayPageProps {
  params: Promise<{
    date: string;
  }>;
}

export default async function DayPage({ params }: DayPageProps) {
  const { date } = await params;

  const supabase = await createClient();
  const [{ data: { user } }, guilds] = await Promise.all([
    supabase.auth.getUser(),
    getMyGuilds(),
  ]);

  if (guilds.length === 0) {
    redirect('/guilds');
  }

  const currentGuildId = guilds[0].id;
  const t = await getTranslations('Common');

  return (
    <main className={styles.main}>
      <Link href="/" className={styles.backLink}>
        <ChevronLeft size={20} />
        {t('backToCalendar')}
      </Link>

      <DayEventsList date={date} guildId={currentGuildId} userId={user?.id} />

      <EventWizard isDayView />
    </main>
  );
}
