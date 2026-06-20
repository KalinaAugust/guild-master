import { NextRequest, NextResponse } from 'next/server';
import { getDmUnread } from '@/entities/direct-message/api/getDmUnread';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const state = await getDmUnread();
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch unread state' }, { status: 500 });
  }
}
