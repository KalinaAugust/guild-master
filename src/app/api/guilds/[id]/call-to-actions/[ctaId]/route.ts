import { NextRequest, NextResponse } from 'next/server';
import { deleteCallToAction } from '@/entities/call-to-action/api/deleteCallToAction';
import { requireUser } from '@/shared/api/guildAuth';

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; ctaId: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  try {
    const { ctaId } = await params;
    await deleteCallToAction(ctaId); // RLS enforces author/admin
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete call to action' }, { status: 500 });
  }
}
