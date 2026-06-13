import { NextRequest, NextResponse } from 'next/server';
import { getCommentReadState } from '@/entities/comment/api/getCommentReadState';
import { markCommentsRead } from '@/entities/comment/api/markCommentsRead';
import { requireUser } from '@/shared/api/guildAuth';
import { parseEventId } from '@/shared/lib/parseEventId';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { realId } = parseEventId(id);
    const state = await getCommentReadState(realId);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch read state' }, { status: 500 });
  }
}

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const { realId } = parseEventId(id);
    await markCommentsRead(realId);
    return NextResponse.json({ marked: true });
  } catch {
    return NextResponse.json({ error: 'Failed to mark comments read' }, { status: 500 });
  }
}
