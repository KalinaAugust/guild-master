'use server';
import { createClient } from '@/shared/api/supabase/server';
import { EventParticipant, ParticipantStatus } from '@/shared/types';

export const getEventParticipants = async (
  eventId: string
): Promise<{ participants: EventParticipant[]; currentUserId: string }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('event_participants')
    .select('id, event_id, user_id, status, profiles(full_name, avatar_url)')
    .eq('event_id', eventId);

  if (error) throw error;

  const participants: EventParticipant[] = (data || []).map((row) => {
    const profile = row.profiles as { full_name: string | null; avatar_url: string | null } | null;
    return {
      id: row.id,
      event_id: row.event_id,
      user_id: row.user_id,
      status: row.status as ParticipantStatus,
      profile: {
        fullName: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      },
    };
  });

  return { participants, currentUserId: user?.id ?? '' };
};
