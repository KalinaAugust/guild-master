import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';
import { getEventById } from '@/entities/event/api/getEventById';
import { EventDetailContent } from '@/features/event-detail';
import { EventWizard } from '@/features/create-event';
import { AccessDenied } from './AccessDenied';
import styles from './EventPage.module.css';

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getEventById(id);
  if (!result) notFound();

  const { guildId } = result;

  const { data: membership } = await supabase
    .from('guild_members')
    .select('id')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    let ownerName: string | null = null;

    const { data: guild } = await supabase
      .from('guilds')
      .select('owner_id')
      .eq('id', guildId)
      .single();

    if (guild) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', guild.owner_id)
        .single();
      ownerName = profile?.full_name ?? null;
    }

    return (
      <main className={styles.main}>
        <AccessDenied ownerName={ownerName} />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <EventDetailContent eventId={id} />
      <EventWizard />
    </main>
  );
}
