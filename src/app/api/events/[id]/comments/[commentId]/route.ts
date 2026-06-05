import { NextRequest, NextResponse } from 'next/server';
import { updateComment } from '@/entities/comment/api/updateComment';
import { deleteComment } from '@/entities/comment/api/deleteComment';
import { InvalidCommentError } from '@/entities/comment/api/createComment';
import { requireUser } from '@/shared/api/guildAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { commentId } = await params;
    const { body } = await request.json();
    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid comment body' }, { status: 400 });
    }
    const comment = await updateComment(commentId, body);
    return NextResponse.json(comment);
  } catch (e) {
    if (e instanceof InvalidCommentError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { commentId } = await params;
    await deleteComment(commentId);
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
