import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/shared/api/guildAuth';
import {
  resolveEventJoinRequest,
  ResolveForbiddenError,
  ResolveNotFoundError,
} from '@/features/event-detail/api/resolveEventJoinRequest';
import { parseEventId } from '@/shared/lib/parseEventId';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id, requestId } = await params;
  const { realId } = parseEventId(id);
  const body = await request.json();
  const action: unknown = body?.action;
  if (action !== 'approve' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be approve or decline' }, { status: 400 });
  }

  try {
    await resolveEventJoinRequest(realId, requestId, action);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof ResolveForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (e instanceof ResolveNotFoundError) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to resolve request' }, { status: 500 });
  }
}
