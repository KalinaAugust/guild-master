import { createClient } from '@/shared/api/supabase/server';

export const getMyEventIds = async (guildId: string): Promise<string[]> => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('event_participants')
    .select('event_id, events!inner(guild_id)')
    .eq('user_id', user.id)
    .eq('events.guild_id', guildId)
    .in('status', ['confirmed', 'pending']);

  if (error) throw error;
  return ((data as { event_id: string }[]) ?? []).map(row => row.event_id);
};
