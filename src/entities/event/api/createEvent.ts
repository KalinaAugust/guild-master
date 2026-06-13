import { createClient } from '@/shared/api/supabase/server';
import { ActivityEvent } from '@/shared/types';

export const createEvent = async (event: Omit<ActivityEvent, 'id'> & { guild_id: string }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('events')
    .insert([
      {
        title: event.title,
        description: event.description,
        type: event.type,
        event_date: `${event.date}T${event.time}:00`,
        guild_id: event.guild_id,
        created_by: user?.id,
        week_days: event.weekDays || [],
      }
    ])
    .select()
    .single();
    
  if (error) {
    console.error('Error creating event:', error);
    throw error;
  }
  return data;
};
