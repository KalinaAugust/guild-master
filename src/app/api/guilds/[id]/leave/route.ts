import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/shared/api/guildAuth';

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId } = await params;

  const { data: membership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Not a member' }, { status: 404 });
  }

  if (membership.role === 'OWNER') {
    return NextResponse.json({ error: 'Owner cannot leave the guild' }, { status: 403 });
  }

  const { error } = await supabase
    .from('guild_members')
    .delete()
    .eq('guild_id', guildId)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: 'Failed to leave guild' }, { status: 500 });

  return NextResponse.json({ success: true });
}
