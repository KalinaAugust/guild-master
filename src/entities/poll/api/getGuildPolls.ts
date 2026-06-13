import { createClient } from '@/shared/api/supabase/server';
import type { Poll } from '../model/types';
import { POLL_SELECT, buildPoll, type PollRow } from './mapPollRow';

const MANAGER_ROLES = ['ADMIN', 'OWNER'];

/** Returns the caller's id and guild role (or null when unauthenticated / not a member). */
const resolveCaller = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  guildId: string,
): Promise<{ userId: string | null; role: string | null }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null };
  const { data: membership } = await supabase
    .from('guild_members')
    .select('role')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();
  return { userId: user.id, role: membership?.role ?? null };
};

const canManagePoll = (
  createdBy: string | null,
  userId: string | null,
  role: string | null,
): boolean => (!!userId && createdBy === userId) || MANAGER_ROLES.includes(role ?? '');

export const getGuildPolls = async (guildId: string): Promise<Poll[]> => {
  const supabase = await createClient();
  const { userId, role } = await resolveCaller(supabase, guildId);

  const { data, error } = await supabase
    .from('polls')
    .select(POLL_SELECT)
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as PollRow[]).map((row) =>
    buildPoll(row, userId, canManagePoll(row.created_by, userId, role)),
  );
};

/** Re-reads a single poll (used after mutations) and maps it for the caller. */
export const getPollById = async (pollId: string): Promise<Poll> => {
  const supabase = await createClient();

  const { data: head, error: headError } = await supabase
    .from('polls')
    .select('guild_id')
    .eq('id', pollId)
    .single();
  if (headError) throw headError;

  const { userId, role } = await resolveCaller(supabase, head.guild_id);
  const { data, error } = await supabase
    .from('polls')
    .select(POLL_SELECT)
    .eq('id', pollId)
    .single();
  if (error) throw error;

  const row = data as unknown as PollRow;
  return buildPoll(row, userId, canManagePoll(row.created_by, userId, role));
};
