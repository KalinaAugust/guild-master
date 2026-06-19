import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/api/supabase/server';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: guild, error } = await supabase
    .from('guilds')
    .select('id, public_id, name, description, avatar_url, owner_id, profiles!guilds_owner_id_fkey(public_id, full_name, avatar_url)')
    .eq('id', id)
    .maybeSingle();

  if (error || !guild) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { count } = await supabase
    .from('guild_members')
    .select('id', { count: 'exact', head: true })
    .eq('guild_id', id)
    .eq('status', 'ACCEPTED');

  type ProfileShape = { public_id: string | null; full_name: string | null; avatar_url: string | null } | null;
  const g = guild as unknown as { id: string; public_id: string; name: string; description: string | null; avatar_url: string | null; owner_id: string; profiles: ProfileShape };

  return NextResponse.json({
    id: g.id,
    publicId: g.public_id,
    name: g.name,
    description: g.description || undefined,
    avatarUrl: g.avatar_url || undefined,
    ownerId: g.owner_id,
    ownerName: (g.profiles as ProfileShape)?.full_name ?? null,
    ownerAvatarUrl: (g.profiles as ProfileShape)?.avatar_url ?? null,
    ownerPublicId: (g.profiles as ProfileShape)?.public_id ?? null,
    memberCount: count ?? 0,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id } = await params;
  const { name, description, avatarUrl } = await request.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const forbidden = await requireGuildOwner(supabase, id, user.id);
  if (forbidden) return forbidden;

  const updates: { name: string; description: string | null; avatar_url?: string | null } = {
    name,
    description: description || null,
  };
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl || null;

  const { data: guild, error } = await supabase
    .from('guilds')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !guild) return NextResponse.json({ error: 'Failed to update guild' }, { status: 500 });

  const g = guild as unknown as { id: string; public_id: string; name: string; owner_id: string; description: string | null; avatar_url: string | null };

  return NextResponse.json({
    id: g.id,
    publicId: g.public_id,
    name: g.name,
    ownerId: g.owner_id,
    description: g.description || undefined,
    avatarUrl: g.avatar_url || undefined,
  });
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id } = await params;

  const forbidden = await requireGuildOwner(supabase, id, user.id);
  if (forbidden) return forbidden;

  const { error } = await supabase.from('guilds').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Failed to delete guild' }, { status: 500 });

  return NextResponse.json({ success: true });
}
