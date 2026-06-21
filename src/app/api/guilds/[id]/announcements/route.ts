import { NextRequest, NextResponse } from 'next/server';
import { getGuildAnnouncements } from '@/entities/announcement/api/getGuildAnnouncements';
import { createAnnouncement, InvalidAnnouncementError } from '@/entities/announcement/api/createAnnouncement';
import { requireUser, requireGuildPermission } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await getGuildAnnouncements(id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const forbidden = await requireGuildPermission(auth.supabase, id, auth.user.id, 'announcements');
    if (forbidden) return forbidden;

    const body = await request.json();
    const announcement = await createAnnouncement(id, {
      title: String(body.title ?? ''),
      content: String(body.content ?? ''),
      isPinned: !!body.isPinned,
    });
    return NextResponse.json(announcement, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidAnnouncementError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
  }
}
