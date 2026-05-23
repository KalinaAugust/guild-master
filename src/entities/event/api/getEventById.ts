import { createClient } from '@/shared/api/supabase/server';
import { ActivityEvent } from '@/shared/types';
import dayjs from '@/shared/lib/dayjs';

type RawEventRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  event_date: string;
  guild_id: string;
};

export const getEventById = async (
  id: string
): Promise<{ event: ActivityEvent; guildId: string } | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, type, event_date, guild_id')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const raw = data as RawEventRow;
  const d = dayjs.utc(raw.event_date);
  return {
    event: {
      id: raw.id,
      title: raw.title,
      description: raw.description ?? undefined,
      type: raw.type as ActivityEvent['type'],
      date: d.format('YYYY-MM-DD'),
      time: d.format('HH:mm'),
    },
    guildId: raw.guild_id,
  };
};
