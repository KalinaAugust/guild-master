import { createClient } from '@/shared/api/supabase/server';

export const fetchEvents = async (guildId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('guild_id', guildId)
    .order('event_date', { ascending: true });
    
  if (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
  return data;
};
