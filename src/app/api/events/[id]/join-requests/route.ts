import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/shared/api/guildAuth';
import { getEventJoinRequests } from '@/features/event-detail/api/getEventJoinRequests';
import {
  submitEventJoinRequest,
  JoinRequestConflictError,
} from '@/features/event-detail/api/submitEventJoinRequest';
import { parseEventId } from '@/shared/lib/parseEventId';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const { realId } = parseEventId(id);
    const requests = await getEventJoinRequests(realId);
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const { realId } = parseEventId(id);
    const request = await submitEventJoinRequest(realId);
    return NextResponse.json({ id: request.id }, { status: 201 });
  } catch (e) {
    if (e instanceof JoinRequestConflictError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}
