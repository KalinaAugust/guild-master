import { createClient } from '@/shared/api/supabase/server';
import { ActivityEvent } from '@/shared/types';
import { buildEndDate } from '@/shared/lib/eventInterval';
import dayjs from '@/shared/lib/dayjs';

export const updateEvent = async (id: string, event: Partial<Omit<ActivityEvent, 'id'>>) => {
  const supabase = await createClient();
  
  const updateData: {
    title?: string;
    description?: string | null;
    type?: string;
    event_date?: string;
    end_date?: string | null;
    week_days?: number[];
    exceptions?: string[];
  } = {};

  if (event.title !== undefined) updateData.title = event.title;
  if (event.description !== undefined) updateData.description = event.description;
  if (event.type !== undefined) updateData.type = event.type;
  if (event.weekDays !== undefined) updateData.week_days = event.weekDays;
  if (event.exceptions !== undefined) updateData.exceptions = event.exceptions;

  if (event.date && event.time) {
    updateData.event_date = `${event.date}T${event.time}:00`;
  }

  if (event.endTime !== undefined) {
    let date = event.date;
    let time = event.time;
    if (!date || !time) {
      // endTime changed without a date/time change — source them from the stored event_date.
      const { data: existing, error: fetchError } = await supabase
        .from('events')
        .select('event_date')
        .eq('id', id)
        .single();
      if (fetchError) {
        console.error('Error fetching event for end_date recompute:', fetchError);
        throw fetchError;
      }
      const d = dayjs.utc(existing.event_date);
      date = date ?? d.format('YYYY-MM-DD');
      time = time ?? d.format('HH:mm');
    }
    updateData.end_date = buildEndDate(date, time, event.endTime);
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
};
