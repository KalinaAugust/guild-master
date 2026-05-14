import Link from 'next/link';
import { getMyGuilds } from '@/entities/guild';
import { redirect } from 'next/navigation';

interface DayPageProps {
  params: Promise<{
    date: string;
  }>;
}

export default async function DayPage({ params }: DayPageProps) {
  const { date } = await params;
  const guilds = await getMyGuilds();

  if (guilds.length === 0) {
    redirect('/guilds/create');
  }

  // We could fetch events specific to this day here, but for now we'll rely on the existing Redux state or render a basic layout.
  // Since Redux is client-side state, a fully SSR page would need to fetch events directly from Supabase.
  // For the MVP of this task, we will scaffold the page structure.

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
      <Link href="/" style={{ 
        display: 'inline-block', 
        marginBottom: '20px', 
        color: 'var(--accent-primary)', 
        textDecoration: 'none',
        fontWeight: 'bold'
      }}>
        &larr; Назад в календарь
      </Link>
      
      <div style={{ 
        padding: '30px', 
        borderRadius: '24px', 
        background: 'var(--glass-bg)', 
        border: '1px solid var(--glass-border)',
        backdropFilter: 'var(--glass-blur)'
      }}>
        <h1 style={{ marginBottom: '20px', fontSize: '2rem' }}>Расписание на {date}</h1>
        
        <p style={{ opacity: 0.7 }}>
          Здесь будет отображаться детальный список событий на выбранный день.
        </p>
      </div>
    </main>
  );
}
