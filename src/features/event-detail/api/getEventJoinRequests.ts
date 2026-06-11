import { createClient } from '@/shared/api/supabase/server';
import { resolveDisplayName } from '@/entities/user';

export interface EventJoinRequestRow {
  id: string;
  userId: string;
  publicId: string | null;
  userName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export const getEventJoinRequests = async (eventId: string): Promise<EventJoinRequestRow[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('event_join_requests')
    .select('id, user_id, created_at, profiles(public_id, full_name, avatar_url, alias, display_as_alias)')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    publicId: r.profiles?.public_id ?? null,
    userName: resolveDisplayName({
      fullName: r.profiles?.full_name ?? null,
      alias: r.profiles?.alias ?? null,
      displayAsAlias: r.profiles?.display_as_alias ?? false,
    }),
    avatarUrl: r.profiles?.avatar_url ?? null,
    createdAt: r.created_at,
  }));
};
