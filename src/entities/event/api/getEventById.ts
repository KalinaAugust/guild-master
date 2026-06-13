import { createClient } from '@/shared/api/supabase/server';
import { ActivityEvent } from '@/shared/types';
import { parseEventId } from '@/shared/lib/parseEventId';
import dayjs from '@/shared/lib/dayjs';

type RawEventRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  event_date: string;
  guild_id: string;
  created_by: string;
  week_days: number[] | null;
  exceptions: string[] | null;
};

export const getEventById = async (
  id: string
): Promise<{ event: ActivityEvent; guildId: string } | null> => {
  const { realId, date: occurrenceDate } = parseEventId(id);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, type, event_date, guild_id, created_by, week_days, exceptions')
    .eq('id', realId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  if (!data) return null;

  const raw = data as RawEventRow;
  const d = dayjs.utc(raw.event_date);
  
  // If this is a recurring occurrence, we use the occurrence date.
  // Otherwise, we use the event's original date.
  const displayDate = occurrenceDate || d.format('YYYY-MM-DD');

  return {
    event: {
      id: id, // return the requested (possibly virtual) ID
      title: raw.title,
      description: raw.description ?? undefined,
      type: raw.type as ActivityEvent['type'],
      date: displayDate,
      time: d.format('HH:mm'),
      createdBy: raw.created_by,
      weekDays: raw.week_days || undefined,
      exceptions: raw.exceptions || undefined,
    },
    guildId: raw.guild_id,
  };
};
