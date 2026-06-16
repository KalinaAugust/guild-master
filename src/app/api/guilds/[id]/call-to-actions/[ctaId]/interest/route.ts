import { NextRequest, NextResponse } from 'next/server';
import { toggleInterest } from '@/entities/call-to-action/api/toggleInterest';
import { requireUser } from '@/shared/api/guildAuth';

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; ctaId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { ctaId } = await params;
    const cta = await toggleInterest(ctaId);
    return NextResponse.json(cta);
  } catch {
    return NextResponse.json({ error: 'Failed to toggle interest' }, { status: 500 });
  }
}
