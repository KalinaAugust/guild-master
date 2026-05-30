import { NextRequest, NextResponse } from 'next/server';
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';
import { createAdminClient } from '@/shared/api/supabase/admin';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';

const USER_LOOKUP_PAGE_SIZE = 1000;
const USER_LOOKUP_MAX_PAGES = 100;

/**
 * Looks up an auth user by email. supabase-js v2 admin API has no email filter,
 * so we page through listUsers until a match is found or the list is exhausted.
 */
async function findUserByEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  email: string,
) {
  for (let page = 1; page <= USER_LOOKUP_MAX_PAGES; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: USER_LOOKUP_PAGE_SIZE,
    });
    if (error) return null;

    const match = data.users.find((u) => u.email === email);
    if (match) return match;

    if (data.users.length < USER_LOOKUP_PAGE_SIZE) break;
  }
  return null;
}

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
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const { supabase, user } = auth;

  const { id: guildId } = await params;
  const body = await request.json();
  const email: string | undefined = body?.email;
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const forbidden = await requireGuildRole(supabase, guildId, user.id, ['OWNER', 'ADMIN']);
  if (forbidden) return forbidden;

  const adminClient = createAdminClient();
  const targetUser = await findUserByEmail(adminClient, email);

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
