import { NextRequest, NextResponse } from 'next/server';
import { getAnnouncementsUnread } from '@/entities/announcement/api/getAnnouncementsUnread';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const state = await getAnnouncementsUnread(id);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch unread state' }, { status: 500 });
  }
}
