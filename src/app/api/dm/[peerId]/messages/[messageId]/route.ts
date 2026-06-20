import { NextRequest, NextResponse } from 'next/server';
import { updateDirectMessage } from '@/entities/direct-message/api/updateDirectMessage';
import { deleteDirectMessage } from '@/entities/direct-message/api/deleteDirectMessage';
import { InvalidDirectMessageError } from '@/entities/direct-message/api/createDirectMessage';
import { requireUser } from '@/shared/api/guildAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ peerId: string; messageId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { messageId } = await params;
    const { body } = await request.json();
    if (typeof body !== 'string') {
      return NextResponse.json({ error: 'Invalid message body' }, { status: 400 });
    }
    const message = await updateDirectMessage(messageId, body);
    return NextResponse.json(message);
  } catch (e) {
    if (e instanceof InvalidDirectMessageError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ peerId: string; messageId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { messageId } = await params;
    await deleteDirectMessage(messageId);
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
