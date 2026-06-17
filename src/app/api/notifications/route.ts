import { NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

type FeedRow = { title: string; guild_id: string | null; guild_name: string | null };

export async function GET() {
  const supabase = await createClient();

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id, type, entity_type, entity_id, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!notifications?.length) return NextResponse.json([]);

  const idsOf = (entityType: string) => [...new Set(
    notifications
      .filter((n) => n.entity_type === entityType && n.entity_id)
      .map((n) => n.entity_id as string)
  )];

  const eventIds = idsOf('event');
  const guildIds = idsOf('guild');
  const ctaIds = idsOf('call_to_action');
  const announcementIds = idsOf('announcement');

  let eventsMap: Record<string, { title: string; event_date: string; guild_name: string | null }> = {};
  let guildsMap: Record<string, string> = {};
  let ctaMap: Record<string, FeedRow> = {};
  let announcementMap: Record<string, FeedRow> = {};

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

  const buildFeedMap = async (table: 'call_to_actions' | 'announcements', ids: string[]) => {
    if (ids.length === 0) return { map: {} as Record<string, FeedRow>, error: null };
    const { data, error: queryError } = await supabase
      .from(table)
      .select('id, title, guild_id, guilds(name)')
      .in('id', ids);
    if (queryError) return { map: {} as Record<string, FeedRow>, error: queryError };
    return {
      map: Object.fromEntries(
        (data ?? []).map((r) => {
          const guild = r.guilds as { name: string } | null;
          return [r.id, { title: r.title, guild_id: r.guild_id ?? null, guild_name: guild?.name ?? null }];
        })
      ) as Record<string, FeedRow>,
      error: null,
    };
  };

  const ctaResult = await buildFeedMap('call_to_actions', ctaIds);
  if (ctaResult.error) return NextResponse.json({ error: ctaResult.error.message }, { status: 500 });
  ctaMap = ctaResult.map;

  const announcementResult = await buildFeedMap('announcements', announcementIds);
  if (announcementResult.error) return NextResponse.json({ error: announcementResult.error.message }, { status: 500 });
  announcementMap = announcementResult.map;

  const result = notifications.map((n) => {
    const id = n.entity_id ?? '';
    const feed = n.entity_type === 'call_to_action'
      ? ctaMap[id]
      : n.entity_type === 'announcement'
        ? announcementMap[id]
        : undefined;
    return {
      ...n,
      event_title: n.entity_type === 'event' ? (eventsMap[id]?.title ?? null) : null,
      event_date: n.entity_type === 'event' ? (eventsMap[id]?.event_date ?? null) : null,
      title: feed?.title ?? null,
      guild_id: feed?.guild_id ?? null,
      guild_name: n.entity_type === 'event'
        ? (eventsMap[id]?.guild_name ?? null)
        : n.entity_type === 'guild'
          ? (guildsMap[id] ?? null)
          : (feed?.guild_name ?? null),
    };
  });

  return NextResponse.json(result);
}
