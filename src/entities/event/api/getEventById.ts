import { createClient } from '@/shared/api/supabase/server';
import { ActivityEvent } from '@/shared/types';
import { parseEventId } from '@/shared/lib/parseEventId';
import dayjs from '@/shared/lib/dayjs';
import { deriveEnd } from '@/shared/lib/eventInterval';

type RawEventRow = {
  id: string;
  public_id: string;
  title: string;
  description: string | null;
  type: string;
  event_date: string;
  end_date: string | null;
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
    .select('id, public_id, title, description, type, event_date, end_date, guild_id, created_by, week_days, exceptions')
    .eq('id', realId)
    .maybeSingle();

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
  const eventPublicId = raw.public_id;

  const occEnd =
    occurrenceDate && raw.end_date
      ? dayjs
          .utc(raw.end_date)
          .add(dayjs.utc(occurrenceDate).diff(d.startOf('day'), 'day'), 'day')
          .toISOString()
      : raw.end_date;

  return {
    event: {
      id: id, // return the requested (possibly virtual) ID
      publicId: occurrenceDate ? `${eventPublicId}_${occurrenceDate}` : eventPublicId,
      title: raw.title,
      description: raw.description ?? undefined,
      type: raw.type as ActivityEvent['type'],
      date: displayDate,
      time: d.format('HH:mm'),
      ...deriveEnd(raw.event_date, occEnd),
      createdBy: raw.created_by,
      weekDays: raw.week_days || undefined,
      exceptions: raw.exceptions || undefined,
    },
    guildId: raw.guild_id,
  };
};
