import { createClient } from '@/shared/api/supabase/server';
import { ActivityEvent, ActivityType } from '@/shared/types';
import dayjs from '@/shared/lib/dayjs';

export const getServerEvents = async (guildId: string): Promise<ActivityEvent[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('guild_id', guildId)
    .order('event_date', { ascending: true });
    
  if (error) {
    console.error('Error fetching events:', error);
    return [];
  }

  return (data || []).map((raw) => {
    const d = dayjs.utc(raw.event_date);
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description || undefined,
      type: raw.type as ActivityType,
      date: d.format('YYYY-MM-DD'),
      time: d.format('HH:mm'),
      createdBy: raw.created_by,
    };
  });
};

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
