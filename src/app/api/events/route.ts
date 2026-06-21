import { NextRequest, NextResponse } from 'next/server';
import { fetchEvents } from '@/entities/event/api/getEvents';
import { createEvent } from '@/entities/event/api/createEvent';
import { requireUser, requireGuildPermission } from '@/shared/api/guildAuth';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });
  try {
    const data = await fetchEvents(guildId);
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const guildId = String(body.guild_id ?? '');
    if (!guildId) return NextResponse.json({ error: 'guild_id required' }, { status: 400 });
    const forbidden = await requireGuildPermission(auth.supabase, guildId, auth.user.id, 'events');
    if (forbidden) return forbidden;

    const data = await createEvent(body);
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
