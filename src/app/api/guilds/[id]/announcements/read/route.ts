import { NextRequest, NextResponse } from 'next/server';
import { markAnnouncementsRead } from '@/entities/announcement/api/markAnnouncementsRead';
import { requireUser } from '@/shared/api/guildAuth';

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    await markAnnouncementsRead(id);
    return NextResponse.json({ marked: true });
  } catch {
    return NextResponse.json({ error: 'Failed to mark announcements read' }, { status: 500 });
  }
}
