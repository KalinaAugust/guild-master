import { NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, type, entity_type, entity_id, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!notifications?.length) return NextResponse.json([]);

  const eventIds = [...new Set(
    notifications
      .filter((n) => n.entity_type === 'event' && n.entity_id)
      .map((n) => n.entity_id as string)
  )];

  const guildIds = [...new Set(
    notifications
      .filter((n) => n.entity_type === 'guild' && n.entity_id)
      .map((n) => n.entity_id as string)
  )];

  let eventsMap: Record<string, { title: string; event_date: string; guild_name: string | null }> = {};
  let guildsMap: Record<string, string> = {};

  if (eventIds.length > 0) {
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, event_date, guilds(name)')
      .in('id', eventIds);

    if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 });

    eventsMap = Object.fromEntries(
      (events ?? []).map((e) => {
        const guild = e.guilds as { name: string } | null;
        return [e.id, {
          title: e.title,
          event_date: e.event_date,
          guild_name: guild?.name ?? null,
        }];
      })
    );
  }

  if (guildIds.length > 0) {
    const { data: guilds } = await supabase
      .from('guilds')
      .select('id, name')
      .in('id', guildIds);

    guildsMap = Object.fromEntries((guilds ?? []).map((g) => [g.id, g.name]));
  }

  const result = notifications.map((n) => ({
    ...n,
    event_title: n.entity_type === 'event' ? (eventsMap[n.entity_id ?? '']?.title ?? null) : null,
    event_date: n.entity_type === 'event' ? (eventsMap[n.entity_id ?? '']?.event_date ?? null) : null,
    guild_name: n.entity_type === 'event'
      ? (eventsMap[n.entity_id ?? '']?.guild_name ?? null)
      : n.entity_type === 'guild'
        ? (guildsMap[n.entity_id ?? ''] ?? null)
        : null,
  }));

  return NextResponse.json(result);
}
