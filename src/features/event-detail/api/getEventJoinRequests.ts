import { createClient } from '@/shared/api/supabase/server';

export interface EventJoinRequestRow {
  id: string;
  userId: string;
  userName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export const getEventJoinRequests = async (eventId: string): Promise<EventJoinRequestRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('event_join_requests')
    .select('id, user_id, created_at, profiles(full_name, avatar_url)')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    userName: r.profiles?.full_name ?? null,
    avatarUrl: r.profiles?.avatar_url ?? null,
    createdAt: r.created_at,
  }));
};
