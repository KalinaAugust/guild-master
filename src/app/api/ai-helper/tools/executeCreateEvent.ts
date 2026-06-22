// src/app/api/ai-helper/tools/executeCreateEvent.ts
import { createEvent } from '@/entities/event/api/createEvent';
import { executeAddParticipants } from './executeAddParticipants';

export interface CreateEventArgs {
  title: string;
  date: string;
  time: string;
  type: 'game' | 'meeting' | 'other' | 'party' | 'sport' | 'dnd' | 'boardgame';
  description: string;
  endTime?: string;
  weekDays?: number[];
  userIds?: string[];
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
      endTime: args.endTime,
      weekDays: args.weekDays,
      guild_id: guildId,
    });
    if (args.userIds && args.userIds.length > 0) {
      // Best-effort: a participant error must not undo a successful event creation.
      await executeAddParticipants({ eventId: data.id, userIds: args.userIds }, guildId);
    }
    return { success: true, eventId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
};
