import { NextRequest, NextResponse } from 'next/server';
import { updateGuildMessage } from '@/entities/guild-message/api/updateGuildMessage';
import { deleteGuildMessage } from '@/entities/guild-message/api/deleteGuildMessage';
import { InvalidGuildMessageError } from '@/entities/guild-message/api/createGuildMessage';
import { requireUser } from '@/shared/api/guildAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { messageId } = await params;
    const { body } = await request.json();
    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid message body' }, { status: 400 });
    }
    const message = await updateGuildMessage(messageId, body);
    return NextResponse.json(message);
  } catch (e) {
    if (e instanceof InvalidGuildMessageError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { messageId } = await params;
    await deleteGuildMessage(messageId);
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
