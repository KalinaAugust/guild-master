import { NextRequest, NextResponse } from 'next/server';
import { getDirectMessages } from '@/entities/direct-message/api/getDirectMessages';
import { createDirectMessage, InvalidDirectMessageError } from '@/entities/direct-message/api/createDirectMessage';
import { resolvePeerId, PeerNotFoundError } from '@/entities/direct-message/api/resolvePeer';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ peerId: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { peerId } = await params;
    const uuid = await resolvePeerId(peerId);
    const { searchParams } = request.nextUrl;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const before = searchParams.get('before') ?? undefined;
    const after = searchParams.get('after') ?? undefined;
    const page = await getDirectMessages(uuid, { limit, before, after });
    return NextResponse.json(page);
  } catch (e) {
    if (e instanceof PeerNotFoundError) return NextResponse.json({ error: 'Peer not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ peerId: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { peerId } = await params;
    const uuid = await resolvePeerId(peerId);
    const { body, attachmentUrl } = await request.json();
    if (typeof body !== 'string') return NextResponse.json({ error: 'Invalid message body' }, { status: 400 });
    if (attachmentUrl != null && typeof attachmentUrl !== 'string') return NextResponse.json({ error: 'Invalid attachment' }, { status: 400 });
    const message = await createDirectMessage(uuid, body, attachmentUrl ?? null);
    return NextResponse.json(message, { status: 201 });
  } catch (e) {
    if (e instanceof PeerNotFoundError) return NextResponse.json({ error: 'Peer not found' }, { status: 404 });
    if (e instanceof InvalidDirectMessageError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
