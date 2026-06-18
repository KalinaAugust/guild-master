import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/shared/api/supabase/server';
import { getEventById } from '@/entities/event/api/getEventById';
import { EventDetailContent } from '@/features/event-detail';
import { EventWizard } from '@/features/create-event';
import { AccessDenied } from './AccessDenied';
import { parseEventId } from '@/shared/lib/parseEventId';
import { isUuid } from '@/shared/lib/isUuid';
import styles from './EventPage.module.css';

interface EventPageProps {
  params: Promise<{ publicId: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { publicId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { realId: pId, date: occurrenceDate } = parseEventId(publicId);

  let eventUuid: string;
  if (isUuid(pId)) {
    const { data } = await supabase
      .from('events')
      .select('id, public_id')
      .eq('id', pId)
      .maybeSingle();

    if (!data) notFound();
    redirect(occurrenceDate ? `/events/${data.public_id}_${occurrenceDate}` : `/events/${data.public_id}`);
  } else {
    const { data } = await supabase
      .from('events')
      .select('id, public_id')
      .eq('public_id', pId)
      .maybeSingle();

    if (!data) notFound();
    eventUuid = data.id;
  }

  const fullId = occurrenceDate ? `${eventUuid}_${occurrenceDate}` : eventUuid;

  const result = await getEventById(fullId);
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
      <EventDetailContent eventId={fullId} />
      <EventWizard userId={user.id} />
    </main>
  );
}
