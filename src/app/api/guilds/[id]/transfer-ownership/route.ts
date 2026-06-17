import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId } = await params;

  // Only the current owner may transfer ownership.
  const forbidden = await requireGuildOwner(supabase, guildId, user.id);
  if (forbidden) return forbidden;

  const body = (await request.json().catch(() => null)) as { newOwnerId?: unknown } | null;
  const newOwnerId = body?.newOwnerId;
  if (typeof newOwnerId !== 'string' || !newOwnerId) {
    return NextResponse.json({ error: 'Invalid new owner' }, { status: 400 });
  }

  const { data: targetMembership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', newOwnerId)
    .maybeSingle();

  if (!targetMembership) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const { error } = await supabase.rpc('transfer_guild_ownership', {
    p_guild_id: guildId,
    p_new_owner_id: newOwnerId,
  });

  if (error) return NextResponse.json({ error: 'Failed to transfer ownership' }, { status: 500 });

  return NextResponse.json({ success: true });
}
