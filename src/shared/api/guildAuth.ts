import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from './supabase/server';
import type { Database } from './supabase/types';

type Client = SupabaseClient<Database>;

export type AuthResult =
  | { ok: true; supabase: Client; user: User }
  | { ok: false; response: NextResponse };

/**
 * Resolves the current authenticated user, or a ready-to-return 401 response.
 * Usage: `const auth = await requireUser(); if (!auth.ok) return auth.response;`
 */
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { ok: true, supabase, user };
}

/**
 * Returns a 403 response if the user lacks one of `roles` in the guild, otherwise null.
 */
export async function requireGuildRole(
  supabase: Client,
  guildId: string,
  userId: string,
  roles: string[],
): Promise<NextResponse | null> {
  const { data: membership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .single();

  if (!membership || !roles.includes(membership.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

/**
 * Returns a 403 response if the user is not the guild owner, otherwise null.
 */
export async function requireGuildOwner(
  supabase: Client,
  guildId: string,
  userId: string,
): Promise<NextResponse | null> {
  const { data: guild } = await supabase
    .from('guilds')
    .select('owner_id')
    .eq('id', guildId)
    .single();

  if (!guild || guild.owner_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
