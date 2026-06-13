import { NextRequest, NextResponse } from 'next/server';
import { syncParticipants } from '@/entities/event/api/syncParticipants';
import { parseEventId } from '@/shared/lib/parseEventId';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { realId } = parseEventId(eventId);
    const { userIds } = await request.json();
    await syncParticipants(realId, userIds);
    return NextResponse.json({ synced: true });
  } catch {
    return NextResponse.json({ error: 'Failed to sync participants' }, { status: 500 });
  }
}
