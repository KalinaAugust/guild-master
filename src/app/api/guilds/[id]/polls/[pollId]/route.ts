import { NextRequest, NextResponse } from 'next/server';
import { deletePoll } from '@/entities/poll/api/deletePoll';
import { closePoll } from '@/entities/poll/api/closePoll';
import { requireUser } from '@/shared/api/guildAuth';

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { pollId } = await params;
    const result = await deletePoll(pollId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 });
  }
}

export async function PATCH(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { pollId } = await params;
    const poll = await closePoll(pollId);
    return NextResponse.json(poll);
  } catch {
    return NextResponse.json({ error: 'Failed to close poll' }, { status: 500 });
  }
}
