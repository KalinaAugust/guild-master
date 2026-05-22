import { NextRequest, NextResponse } from 'next/server';
import { getEventParticipants } from '@/features/event-detail/api/getEventParticipants';
import { updateParticipantStatus } from '@/features/event-detail/api/updateParticipantStatus';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const data = await getEventParticipants(eventId);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch participants';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { status } = await request.json();
    await updateParticipantStatus(eventId, status);
    return NextResponse.json({ updated: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
