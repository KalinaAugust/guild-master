import { createClient } from '@/shared/api/supabase/server';
import { EventParticipant, ParticipantStatus } from '@/shared/types';

export const getEventParticipants = async (
  eventId: string
): Promise<{
  participants: EventParticipant[];
  currentUserId: string;
  viewerIsGuildMember: boolean;
  viewerHasPendingRequest: boolean;
}> => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data, error } = await db
    .from('event_participants')
    .select('id, event_id, user_id, status, profiles(full_name, avatar_url)')
    .eq('event_id', eventId);

  if (error) throw error;

  const participants: EventParticipant[] = ((data as Record<string, unknown>[]) || []).map((row) => {
    const profile = row['profiles'] as { full_name: string | null; avatar_url: string | null } | null;
    return {
      id: row['id'] as string,
      event_id: row['event_id'] as string,
      user_id: row['user_id'] as string,
      status: row['status'] as ParticipantStatus,
      profile: {
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      },
    };
  });

  const { data: eventRow } = await db
    .from('events')
    .select('guild_id')
    .eq('id', eventId)
    .single();

  let viewerIsGuildMember = false;
  if (eventRow?.guild_id) {
    const { data: membership } = await db
      .from('guild_members')
      .select('id')
      .eq('guild_id', eventRow.guild_id)
      .eq('user_id', user.id)
      .maybeSingle();
    viewerIsGuildMember = !!membership;
  }

  const { data: pendingRequest } = await db
    .from('event_join_requests')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  return {
    participants,
    currentUserId: user.id,
    viewerIsGuildMember,
    viewerHasPendingRequest: !!pendingRequest,
  };
};
