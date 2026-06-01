import { NextRequest, NextResponse } from 'next/server';
import { getMyEventIds } from '@/entities/event/api/getMyEventIds';

export async function GET(request: NextRequest) {
  const guildId = request.nextUrl.searchParams.get('guildId');
  if (!guildId) return NextResponse.json({ error: 'guildId required' }, { status: 400 });
  try {
    const eventIds = await getMyEventIds(guildId);
    return NextResponse.json({ eventIds });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch event IDs' }, { status: 500 });
  }
}
