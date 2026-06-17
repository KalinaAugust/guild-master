import { NextRequest, NextResponse } from 'next/server';
import { launchCallToAction } from '@/entities/call-to-action/api/launchCallToAction';
import { requireUser } from '@/shared/api/guildAuth';

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; ctaId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { ctaId } = await params;
    const cta = await launchCallToAction(ctaId);
    return NextResponse.json(cta);
  } catch {
    return NextResponse.json({ error: 'Failed to launch call to action' }, { status: 500 });
  }
}
