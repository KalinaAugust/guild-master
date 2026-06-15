import { updateEvent } from '@/entities/event/api/updateEvent';
import type { ActivityType } from '@/shared/types';

export interface EditEventArgs {
  id: string;
  title?: string;
  date?: string;
  time?: string;
  type?: ActivityType;
  description?: string;
  weekDays?: number[];
}

export const executeEditEvent = async (
  args: EditEventArgs,
): Promise<{ success: boolean; eventId?: string; error?: string }> => {
  if ((args.date && !args.time) || (!args.date && args.time)) {
    return { success: false, error: 'Both date and time must be provided together' };
  }
  try {
    const { id, ...fields } = args;
    const data = await updateEvent(id, fields);
    return { success: true, eventId: (data as { id: string }).id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
};
