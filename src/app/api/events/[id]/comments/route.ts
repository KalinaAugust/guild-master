import { NextRequest, NextResponse } from 'next/server';
import { getComments } from '@/entities/comment/api/getComments';
import { createComment, InvalidCommentError } from '@/entities/comment/api/createComment';
import { requireUser } from '@/shared/api/guildAuth';
import { parseEventId } from '@/shared/lib/parseEventId';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { realId } = parseEventId(id);
    const comments = await getComments(realId);
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
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
    const { realId } = parseEventId(id);
    const { body } = await request.json();
    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid comment body' }, { status: 400 });
    }
    const comment = await createComment(realId, body);
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidCommentError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
