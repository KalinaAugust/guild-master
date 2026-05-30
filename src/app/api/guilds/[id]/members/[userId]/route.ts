import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId, userId } = await params;

  const forbidden = await requireGuildRole(supabase, guildId, user.id, ['OWNER', 'ADMIN']);
  if (forbidden) return forbidden;

  const { data: targetMembership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!targetMembership) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  if (targetMembership.role === 'OWNER') {
    return NextResponse.json({ error: 'Cannot remove guild owner' }, { status: 403 });
  }

  const { error } = await supabase
    .from('guild_members')
    .delete()
    .eq('guild_id', guildId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });

  return NextResponse.json({ success: true });
}
