import { NextRequest, NextResponse } from 'next/server';
import { getDmReadState } from '@/entities/direct-message/api/getDmReadState';
import { markDmRead } from '@/entities/direct-message/api/markDmRead';
import { resolvePeerId, PeerNotFoundError } from '@/entities/direct-message/api/resolvePeer';
import { requireUser } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ peerId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { peerId } = await params;
    const uuid = await resolvePeerId(peerId);
    const state = await getDmReadState(uuid);
    return NextResponse.json(state);
  } catch (err) {
    if (err instanceof PeerNotFoundError) {
      return NextResponse.json({ error: 'Peer not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch read state' }, { status: 500 });
  }
}

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ peerId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { peerId } = await params;
    const uuid = await resolvePeerId(peerId);
    await markDmRead(uuid);
    return NextResponse.json({ marked: true });
  } catch (err) {
    if (err instanceof PeerNotFoundError) {
      return NextResponse.json({ error: 'Peer not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to mark DM read' }, { status: 500 });
  }
}
