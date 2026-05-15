'use server';
import { createClient } from '@/shared/api/supabase/server';
import { ActivityEvent } from '@/shared/types';

export const updateEvent = async (id: string, event: Partial<Omit<ActivityEvent, 'id'>>) => {
  const supabase = await createClient();
  
  const updateData: {
    title?: string;
    description?: string;
    type?: string;
    event_date?: string;
  } = {
    title: event.title,
    description: event.description,
    type: event.type,
  };
  
  if (event.date && event.time) {
    updateData.event_date = `${event.date}T${event.time}:00`;
  } else if (event.date) {
    // If only date is provided, we might need to preserve current time or handle it
    // For now assume both or none for simplicity in this helper
  }

  const { data, error } = await supabase
    .from('events')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating event:', error);
    throw error;
  }
  return data;
}
