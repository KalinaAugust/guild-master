import { NextResponse } from 'next/server';
import { requireUser } from '@/shared/api/guildAuth';

export async function PATCH() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { error } = await auth.supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', auth.user.id)
    .eq('is_read', false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
