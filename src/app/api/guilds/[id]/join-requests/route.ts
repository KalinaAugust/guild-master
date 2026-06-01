import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';
import { createAdminClient } from '@/shared/api/supabase/admin';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId } = await params;

  const forbidden = await requireGuildOwner(supabase, guildId, user.id);
  if (forbidden) return forbidden;

  const { data, error } = await supabase
    .from('guild_join_requests')
    .select('id, user_id, created_at, profiles!guild_join_requests_user_id_fkey(full_name, avatar_url)')
    .eq('guild_id', guildId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });

  type ProfileShape = { full_name: string | null; avatar_url: string | null } | null;

  return NextResponse.json(
    (data ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: (r.profiles as ProfileShape)?.full_name ?? null,
      avatarUrl: (r.profiles as ProfileShape)?.avatar_url ?? null,
      createdAt: r.created_at,
    }))
  );
}

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId } = await params;

  const { data: existingMember } = await supabase
    .from('guild_members')
    .select('id')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 });
  }

  const { data: existingRequest } = await supabase
    .from('guild_join_requests')
    .select('id')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingRequest) {
    return NextResponse.json({ error: 'Request already pending' }, { status: 409 });
  }

  const { data: request, error } = await supabase
    .from('guild_join_requests')
    .insert({ guild_id: guildId, user_id: user.id, status: 'pending' })
    .select()
    .single();

  if (error || !request) {
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }

  const { data: guild } = await supabase
    .from('guilds')
    .select('owner_id')
    .eq('id', guildId)
    .single();

  if (guild) {
    const adminClient = createAdminClient();
    await adminClient.from('notifications').insert({
      user_id: guild.owner_id,
      type: 'join_request',
      entity_type: 'guild',
      entity_id: guildId,
    });
  }

  return NextResponse.json({ id: request.id, status: request.status }, { status: 201 });
}
