import { NextRequest, NextResponse } from 'next/server';
import { updateAnnouncement } from '@/entities/announcement/api/updateAnnouncement';
import { setPinned } from '@/entities/announcement/api/setPinned';
import { deleteAnnouncement } from '@/entities/announcement/api/deleteAnnouncement';
import { InvalidAnnouncementError } from '@/entities/announcement/api/createAnnouncement';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id, announcementId } = await params;
    const forbidden = await requireGuildRole(auth.supabase, id, auth.user.id, ['ADMIN', 'OWNER']);
    if (forbidden) return forbidden;

    const body = await request.json();
    // Pin toggle when `isPinned` is present; otherwise an edit.
    const announcement =
      typeof body.isPinned === 'boolean'
        ? await setPinned(announcementId, body.isPinned)
        : await updateAnnouncement(announcementId, {
            title: String(body.title ?? ''),
            content: String(body.content ?? ''),
          });
    return NextResponse.json(announcement);
  } catch (e) {
    if (e instanceof InvalidAnnouncementError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id, announcementId } = await params;
    const forbidden = await requireGuildRole(auth.supabase, id, auth.user.id, ['ADMIN', 'OWNER']);
    if (forbidden) return forbidden;

    const result = await deleteAnnouncement(announcementId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
  }
}
