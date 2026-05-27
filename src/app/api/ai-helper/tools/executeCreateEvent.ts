// src/app/api/ai-helper/tools/executeCreateEvent.ts
import { createEvent } from '@/entities/event/api/createEvent';

export interface CreateEventArgs {
  title: string;
  date: string;
  time: string;
  type: 'raid' | 'game' | 'meeting' | 'other';
  description: string;
}

export const executeCreateEvent = async (
  args: CreateEventArgs,
  guildId: string,
): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  try {
    const data = await createEvent({
      title: args.title,
      date: args.date,
      time: args.time,
      type: args.type,
      description: args.description,
      guild_id: guildId,
    });
    return { success: true, eventId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
};
