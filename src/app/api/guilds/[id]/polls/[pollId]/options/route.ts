import { NextRequest, NextResponse } from 'next/server';
import { addPollOption } from '@/entities/poll/api/addPollOption';
import { InvalidVoteError } from '@/entities/poll/api/votePoll';
import { requireUser } from '@/shared/api/guildAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { pollId } = await params;
    const body = await request.json();
    const result = await addPollOption(pollId, typeof body.body === 'string' ? body.body : '');
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidVoteError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add option' }, { status: 500 });
  }
}
