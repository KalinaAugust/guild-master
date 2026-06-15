import { NextRequest, NextResponse } from 'next/server';
import { getAnnouncementComments } from '@/entities/announcement/api/getAnnouncementComments';
import { addAnnouncementComment } from '@/entities/announcement/api/addAnnouncementComment';
import { InvalidAnnouncementError } from '@/entities/announcement/api/createAnnouncement';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  try {
    const { announcementId } = await params;
    const comments = await getAnnouncementComments(announcementId);
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { announcementId } = await params;
    const { body } = await request.json();
    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid comment body' }, { status: 400 });
    }
    const comment = await addAnnouncementComment(announcementId, body);
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidAnnouncementError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
