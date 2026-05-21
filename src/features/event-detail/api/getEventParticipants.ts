'use server';
import { createClient } from '@/shared/api/supabase/server';
import { EventParticipant, ParticipantStatus } from '@/shared/types';

export const getEventParticipants = async (
  eventId: string
): Promise<{ participants: EventParticipant[]; currentUserId: string }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
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

  return { participants, currentUserId: user?.id ?? '' };
};
