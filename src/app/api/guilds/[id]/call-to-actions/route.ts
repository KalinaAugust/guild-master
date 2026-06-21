import { NextRequest, NextResponse } from 'next/server';
import { getCallToActions } from '@/entities/call-to-action/api/getCallToActions';
import { createCallToAction, InvalidCallToActionError } from '@/entities/call-to-action/api/createCallToAction';
import { requireUser, requireGuildPermission } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await getCallToActions(id);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch call to actions' }, { status: 500 });
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
    const forbidden = await requireGuildPermission(auth.supabase, id, auth.user.id, 'call_to_actions');
    if (forbidden) return forbidden;

    const body = await request.json();
    const cta = await createCallToAction(id, {
      title: String(body.title ?? ''),
      description: String(body.description ?? ''),
      type: body.type,
      date: String(body.date ?? ''),
      time: String(body.time ?? ''),
      targetCount: Number(body.targetCount),
    });
    return NextResponse.json(cta, { status: 201 });
  } catch (e) {
    if (e instanceof InvalidCallToActionError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create call to action' }, { status: 500 });
  }
}
