import { NextRequest, NextResponse } from 'next/server';
import { getConversations } from '@/entities/direct-message/api/getConversations';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(_: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const conversations = await getConversations();
    return NextResponse.json(conversations);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
