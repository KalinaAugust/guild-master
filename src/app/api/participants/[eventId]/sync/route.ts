import { NextRequest, NextResponse } from 'next/server';
import { syncParticipants } from '@/entities/event/api/syncParticipants';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { userIds } = await request.json();
    await syncParticipants(eventId, userIds);
    return NextResponse.json({ synced: true });
  } catch {
    return NextResponse.json({ error: 'Failed to sync participants' }, { status: 500 });
  }
}
