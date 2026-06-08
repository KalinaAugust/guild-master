import { NextRequest, NextResponse } from 'next/server';
import { getGuildMessages } from '@/entities/guild-message/api/getGuildMessages';
import { createGuildMessage, InvalidGuildMessageError } from '@/entities/guild-message/api/createGuildMessage';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const messages = await getGuildMessages(id);
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
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
    const { body } = await request.json();
    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid message body' }, { status: 400 });
    }
    const message = await createGuildMessage(id, body);
    return NextResponse.json(message, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidGuildMessageError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
