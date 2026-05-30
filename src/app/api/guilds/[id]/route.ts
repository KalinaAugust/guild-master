import { NextRequest, NextResponse } from 'next/server';
import { requireUser, requireGuildOwner } from '@/shared/api/guildAuth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id } = await params;
  const { name, description } = await request.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const forbidden = await requireGuildOwner(supabase, id, user.id);
  if (forbidden) return forbidden;

  const { data: guild, error } = await supabase
    .from('guilds')
    .update({ name, description: description || null })
    .eq('id', id)
    .select()
    .single();

  if (error || !guild) return NextResponse.json({ error: 'Failed to update guild' }, { status: 500 });

  return NextResponse.json({
    id: guild.id,
    name: guild.name,
    ownerId: guild.owner_id,
    description: guild.description || undefined,
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
