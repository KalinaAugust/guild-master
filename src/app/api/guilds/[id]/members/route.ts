import { NextRequest, NextResponse } from 'next/server';
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';
import { createClient } from '@/shared/api/supabase/server';
import { createAdminClient } from '@/shared/api/supabase/admin';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await getGuildMembers(id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch guild members' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: guildId } = await params;
  const body = await request.json();
  const email: string | undefined = body?.email;
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const { data: callerMembership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .single();

  if (!callerMembership || !['OWNER', 'ADMIN'].includes(callerMembership.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data: listData, error: lookupError } =
    await adminClient.auth.admin.listUsers({ perPage: 1000 });

  const targetUser = lookupError
    ? null
    : listData.users.find((u) => u.email === email) ?? null;

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('guild_members')
    .select('user_id')
    .eq('guild_id', guildId)
    .eq('user_id', targetUser.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 });
  }

  const { error: insertError } = await supabase
    .from('guild_members')
    .insert({ guild_id: guildId, user_id: targetUser.id, role: 'MEMBER' });

  if (insertError) {
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }

  const { data: newRow } = await supabase
    .from('guild_members')
    .select('user_id, role, profiles(full_name, avatar_url)')
    .eq('guild_id', guildId)
    .eq('user_id', targetUser.id)
    .single();

  type ProfileShape = { full_name: string | null; avatar_url: string | null } | null;

  return NextResponse.json({
    userId: newRow!.user_id,
    role: newRow!.role,
    profile: {
      fullName: (newRow!.profiles as ProfileShape)?.full_name ?? null,
      avatarUrl: (newRow!.profiles as ProfileShape)?.avatar_url ?? null,
    },
  });
}
