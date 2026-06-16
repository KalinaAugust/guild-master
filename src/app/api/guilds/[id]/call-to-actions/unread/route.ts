import { NextRequest, NextResponse } from 'next/server';
import { getCallToActionsUnread } from '@/entities/call-to-action/api/getCallToActionsUnread';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const state = await getCallToActionsUnread(id);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch unread state' }, { status: 500 });
  }
}
