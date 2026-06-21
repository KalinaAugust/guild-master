import { NextRequest, NextResponse } from 'next/server';
import { getGuildChatUnread } from '@/entities/guild-message/api/getGuildChatUnread';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const scope = request.nextUrl.searchParams.get('scope') === 'officers' ? 'officers' as const : 'all' as const;
    const state = await getGuildChatUnread(id, scope);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch unread state' }, { status: 500 });
  }
}
