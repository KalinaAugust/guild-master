import { createClient } from '@/shared/api/supabase/server';

export const getMyEventIds = async (guildId: string): Promise<{ eventIds: string[], pendingEventIds: string[] }> => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { eventIds: [], pendingEventIds: [] };

  const { data, error } = await supabase
    .from('event_participants')
    .select('event_id, status, events!inner(guild_id)')
    .eq('user_id', user.id)
    .eq('events.guild_id', guildId)
    .in('status', ['confirmed', 'pending']);

  if (error) throw error;
  
  const eventIds: string[] = [];
  const pendingEventIds: string[] = [];
  
  for (const row of data ?? []) {
    eventIds.push(row.event_id);
    if (row.status === 'pending') {
      pendingEventIds.push(row.event_id);
    }
  }

  return { eventIds, pendingEventIds };
};
