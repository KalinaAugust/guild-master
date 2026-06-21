import { NextRequest, NextResponse } from 'next/server';
import { getGuildChatReadState } from '@/entities/guild-message/api/getGuildChatReadState';
import { markGuildChatRead } from '@/entities/guild-message/api/markGuildChatRead';
import { requireUser } from '@/shared/api/guildAuth';

const parseScope = (raw: string | null) => (raw === 'officers' ? 'officers' as const : 'all' as const);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const scope = parseScope(request.nextUrl.searchParams.get('scope'));
    const state = await getGuildChatReadState(id, scope);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch read state' }, { status: 500 });
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
    const scope = parseScope(request.nextUrl.searchParams.get('scope'));
    await markGuildChatRead(id, scope);
    return NextResponse.json({ marked: true });
  } catch {
    return NextResponse.json({ error: 'Failed to mark chat read' }, { status: 500 });
  }
}
