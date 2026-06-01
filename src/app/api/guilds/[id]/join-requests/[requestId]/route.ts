import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';
import { createAdminClient } from '@/shared/api/supabase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId, requestId } = await params;

  const forbidden = await requireGuildOwner(supabase, guildId, user.id);
  if (forbidden) return forbidden;

  const body = await request.json();
  const action: unknown = body?.action;
  if (action !== 'approve' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be approve or decline' }, { status: 400 });
  }

  const { data: joinRequest } = await supabase
    .from('guild_join_requests')
    .select('user_id')
    .eq('id', requestId)
    .eq('guild_id', guildId)
    .eq('status', 'pending')
    .single();

  if (!joinRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const status = action === 'approve' ? 'approved' : 'declined';

  const { error: updateError } = await supabase
    .from('guild_join_requests')
    .update({ status })
    .eq('id', requestId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }

  if (action === 'approve') {
    const { error: memberError } = await supabase
      .from('guild_members')
      .insert({ guild_id: guildId, user_id: joinRequest.user_id, role: 'MEMBER' });

    if (memberError) {
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    }
  }

  const adminClient = createAdminClient();
  await adminClient.from('notifications').insert({
    user_id: joinRequest.user_id,
    type: action === 'approve' ? 'join_request_approved' : 'join_request_declined',
    entity_type: 'guild',
    entity_id: guildId,
  });

  return NextResponse.json({ success: true });
}
