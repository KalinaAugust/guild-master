import { createClient } from '@/shared/api/supabase/server';
import { ActivityEvent, ActivityType } from '@/shared/types';
import dayjs from '@/shared/lib/dayjs';

interface DbEvent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  event_date: string;
  guild_id: string;
  created_by: string | null;
  week_days: number[] | null;
  exceptions: string[] | null;
}

function generateOccurrences(raw: DbEvent): DbEvent[] {
  const weekDays = raw.week_days || [];
  const exceptions = raw.exceptions || [];
  const d = dayjs.utc(raw.event_date);
  const timeStr = d.format('HH:mm:ss');
  const dateStr = d.format('YYYY-MM-DD');

  if (!weekDays || weekDays.length === 0) {
    if (exceptions.includes(dateStr)) {
      return [];
    }
    return [raw];
  }

  const occurrences: DbEvent[] = [];
  const start = dayjs.utc(raw.event_date).startOf('day');
  const end = dayjs.utc().add(1, 'year').endOf('day');

  let current = start;
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dayNum = current.day();
    if (weekDays.includes(dayNum)) {
      const currentSecs = current.format('YYYY-MM-DD');
      if (!exceptions.includes(currentSecs)) {
        occurrences.push({
          ...raw,
          id: `${raw.id}_${currentSecs}`,
          event_date: `${currentSecs}T${timeStr}`,
        });
      }
    }
    current = current.add(1, 'day');
  }
  return occurrences;
}

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

  const allEvents: DbEvent[] = [];
  for (const raw of (data || []) as DbEvent[]) {
    allEvents.push(...generateOccurrences(raw));
  }

  allEvents.sort((a, b) => {
    const dateDiff = a.event_date.localeCompare(b.event_date);
    if (dateDiff !== 0) return dateDiff;
    return a.title.localeCompare(b.title);
  });

  return allEvents.map((raw) => {
    const d = dayjs.utc(raw.event_date);
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description || undefined,
      type: raw.type as ActivityType,
      date: d.format('YYYY-MM-DD'),
      time: d.format('HH:mm'),
      createdBy: raw.created_by || undefined,
      weekDays: raw.week_days || undefined,
      exceptions: raw.exceptions || undefined,
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

  const allEvents: DbEvent[] = [];
  for (const raw of (data || []) as DbEvent[]) {
    allEvents.push(...generateOccurrences(raw));
  }

  allEvents.sort((a, b) => {
    const dateDiff = a.event_date.localeCompare(b.event_date);
    if (dateDiff !== 0) return dateDiff;
    return a.title.localeCompare(b.title);
  });

  return allEvents;
};
