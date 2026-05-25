import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId, userId } = await params;

  const { data: callerMembership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .single();

  if (!callerMembership || !['OWNER', 'ADMIN'].includes(callerMembership.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
