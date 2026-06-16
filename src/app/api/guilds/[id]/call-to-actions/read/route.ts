import { NextRequest, NextResponse } from 'next/server';
import { markCallToActionsRead } from '@/entities/call-to-action/api/markCallToActionsRead';
import { requireUser } from '@/shared/api/guildAuth';

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    await markCallToActionsRead(id);
    return NextResponse.json({ marked: true });
  } catch {
    return NextResponse.json({ error: 'Failed to mark calls to action read' }, { status: 500 });
  }
}
