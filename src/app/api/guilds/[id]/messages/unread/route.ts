import { NextRequest, NextResponse } from 'next/server';
import { getGuildChatUnread } from '@/entities/guild-message/api/getGuildChatUnread';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const state = await getGuildChatUnread(id);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch unread state' }, { status: 500 });
  }
}
