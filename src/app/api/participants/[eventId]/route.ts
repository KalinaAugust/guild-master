import { NextRequest, NextResponse } from 'next/server';
import { getEventParticipants } from '@/features/event-detail/api/getEventParticipants';
import { updateParticipantStatus } from '@/features/event-detail/api/updateParticipantStatus';
import { addSelfAsParticipant } from '@/features/event-detail/api/addSelfAsParticipant';
import { leaveEvent } from '@/features/event-detail/api/leaveEvent';
import { parseEventId } from '@/shared/lib/parseEventId';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { realId } = parseEventId(eventId);
    const data = await getEventParticipants(realId);
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
    const { realId } = parseEventId(eventId);
    const { status } = await request.json();
    await updateParticipantStatus(realId, status);
    return NextResponse.json({ updated: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { realId } = parseEventId(eventId);
    await addSelfAsParticipant(realId);
    return NextResponse.json({ added: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { realId } = parseEventId(eventId);
    await leaveEvent(realId);
    return NextResponse.json({ left: true });
  } catch {
    return NextResponse.json({ error: 'Failed to leave event' }, { status: 500 });
  }
}
