import { NextRequest, NextResponse } from 'next/server';
import { deleteAnnouncementComment } from '@/entities/announcement/api/deleteAnnouncementComment';
import { requireUser } from '@/shared/api/guildAuth';

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string; commentId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { commentId } = await params;
    // RLS enforces author-or-admin; a non-permitted delete affects 0 rows.
    await deleteAnnouncementComment(commentId);
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
