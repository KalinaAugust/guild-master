import Link from 'next/link';
import { getMyGuilds } from '@/entities/guild';
import { redirect } from 'next/navigation';
import { DayEventsList } from '@/widgets/day-events';
import { EventModal } from '@/features/create-event';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

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
    redirect('/guilds/create');
  }

  // Для MVP берем первую гильдию
  const currentGuildId = guilds[0].id;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
      <Link href="/" style={{ 
        display: 'inline-flex', 
        alignItems: 'center',
        gap: '8px',
        marginBottom: '32px', 
        color: 'var(--text-secondary)', 
        textDecoration: 'none',
        fontWeight: '500',
        transition: 'color 0.2s ease'
      }}>
        <ChevronLeft size={20} />
        {t('backToCalendar')}
      </Link>
      
      <div style={{ 
        padding: '40px', 
        borderRadius: '32px', 
        background: 'var(--glass-bg)', 
        border: '1px solid var(--glass-border)',
        backdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--shadow-glass)'
      }}>
        <DayEventsList date={date} guildId={currentGuildId} />
      </div>

      <EventModal guildId={currentGuildId} isDayView />
    </main>
  );
}
