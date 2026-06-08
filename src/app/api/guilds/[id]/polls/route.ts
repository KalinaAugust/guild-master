import { NextRequest, NextResponse } from 'next/server';
import { getGuildPolls } from '@/entities/poll/api/getGuildPolls';
import { createPoll, InvalidPollError } from '@/entities/poll/api/createPoll';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const polls = await getGuildPolls(id);
    return NextResponse.json(polls);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch polls' }, { status: 500 });
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
    const body = await request.json();
    const poll = await createPoll(id, {
      title: String(body.title ?? ''),
      description: String(body.description ?? ''),
      options: Array.isArray(body.options) ? body.options.map(String) : [],
      isAnonymous: !!body.isAnonymous,
      allowMultiple: !!body.allowMultiple,
      allowCustom: !!body.allowCustom,
    });
    return NextResponse.json(poll, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidPollError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 });
  }
}
