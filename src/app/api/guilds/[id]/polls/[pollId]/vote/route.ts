import { NextRequest, NextResponse } from 'next/server';
import { votePoll, InvalidVoteError } from '@/entities/poll/api/votePoll';
import { setPollVotes } from '@/entities/poll/api/setPollVotes';
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
    const poll = await votePoll(pollId, {
      optionId: typeof body.optionId === 'string' ? body.optionId : undefined,
      customBody: typeof body.customBody === 'string' ? body.customBody : undefined,
    });
    return NextResponse.json(poll);
  } catch (e) {
    if (e instanceof InvalidVoteError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { pollId } = await params;
    const body = await request.json();
    const optionIds = Array.isArray(body.optionIds)
      ? body.optionIds.filter((x: unknown): x is string => typeof x === 'string')
      : [];
    const poll = await setPollVotes(pollId, optionIds);
    return NextResponse.json(poll);
  } catch (e) {
    if (e instanceof InvalidVoteError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}
