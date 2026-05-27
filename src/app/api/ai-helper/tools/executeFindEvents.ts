import { fetchEvents } from '@/entities/event/api/getEvents';
import dayjs from '@/shared/lib/dayjs';
import type { ActivityType } from '@/shared/types';

export interface FindEventsArgs {
  dateFrom?: string;
  dateTo?: string;
  type?: ActivityType;
  keyword?: string;
}

interface FoundEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  description: string | null;
}

export const executeFindEvents = async (
  args: FindEventsArgs,
  guildId: string,
): Promise<{ events: FoundEvent[] } | { events: []; error: string }> => {
  try {
    const raw = await fetchEvents(guildId);
    if (!raw) return { events: [] };

    const filtered = raw.filter((event) => {
      const dateStr = dayjs.utc(event.event_date).format('YYYY-MM-DD');
      if (args.dateFrom && dateStr < args.dateFrom) return false;
      if (args.dateTo && dateStr > args.dateTo) return false;
      if (args.type && event.type !== args.type) return false;
      return !(args.keyword && !event.title.toLowerCase().includes(args.keyword.toLowerCase()));
    });

    const events: FoundEvent[] = filtered.map((event) => {
      const d = dayjs.utc(event.event_date);
      return {
        id: event.id,
        title: event.title,
        date: d.format('YYYY-MM-DD'),
        time: d.format('HH:mm'),
        type: event.type,
        description: event.description,
      };
    });

    return { events };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { events: [], error: message };
  }
};
