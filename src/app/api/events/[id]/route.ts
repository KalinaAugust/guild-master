import { NextRequest, NextResponse } from 'next/server';
import { getEventById } from '@/entities/event/api/getEventById';
import { updateEvent } from '@/entities/event/api/updateEvent';
import { deleteEvent } from '@/entities/event/api/deleteEvent';
import { parseEventId } from '@/shared/lib/parseEventId';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getEventById(id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { realId } = parseEventId(id);
    const body = await request.json();
    const data = await updateEvent(realId, body);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { realId } = parseEventId(id);
    await deleteEvent(realId);
    return NextResponse.json({ deleted: id });
  } catch {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
