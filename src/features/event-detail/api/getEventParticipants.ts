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

  const { data, error } = await supabase
    .from('event_participants')
    .select('id, event_id, user_id, status, profiles(public_id, full_name, avatar_url, alias, display_as_alias, icon)')
    .eq('event_id', eventId);

  if (error) throw error;

  const participants: EventParticipant[] = (data ?? []).map((row) => ({
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    status: row.status as ParticipantStatus,
    profile: {
      publicId: row.profiles?.public_id ?? null,
      fullName: row.profiles?.full_name ?? null,
      avatarUrl: row.profiles?.avatar_url ?? null,
      alias: row.profiles?.alias ?? null,
      displayAsAlias: row.profiles?.display_as_alias ?? false,
      icon: row.profiles?.icon ?? null,
    },
  }));

  const { data: eventRow } = await supabase
    .from('events')
    .select('guild_id')
    .eq('id', eventId)
    .single();

  let viewerIsGuildMember = false;
  if (eventRow?.guild_id) {
    const { data: membership } = await supabase
      .from('guild_members')
      .select('id')
      .eq('guild_id', eventRow.guild_id)
      .eq('user_id', user.id)
      .maybeSingle();
    viewerIsGuildMember = !!membership;
  }

  const { data: pendingRequest } = await supabase
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
