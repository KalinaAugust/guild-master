import { NextRequest, NextResponse } from 'next/server';
import { getCommentReadState } from '@/entities/comment/api/getCommentReadState';
import { markCommentsRead } from '@/entities/comment/api/markCommentsRead';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const state = await getCommentReadState(id);
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
    await markCommentsRead(id);
    return NextResponse.json({ marked: true });
  } catch {
    return NextResponse.json({ error: 'Failed to mark comments read' }, { status: 500 });
  }
}
