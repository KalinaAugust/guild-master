import { buildEndDate } from '@/shared/lib/eventInterval';
import { createClient } from '@/shared/api/supabase/server';
import type { CallToAction, CreateCallToActionInput } from '../model/types';
import { getCallToActionById } from './getCallToActions';

const MAX_TITLE = 120;

/** Thrown when CTA input is invalid (empty/too-long title, bad count or date). */
export class InvalidCallToActionError extends Error {}

export const createCallToAction = async (
  guildId: string,
  input: CreateCallToActionInput,
): Promise<CallToAction> => {
  const supabase = await createClient();

  const title = input.title.trim();
  if (!title) throw new InvalidCallToActionError('Title is empty');
  if (title.length > MAX_TITLE) throw new InvalidCallToActionError('Title is too long');
  if (!Number.isInteger(input.targetCount) || input.targetCount < 1)
    throw new InvalidCallToActionError('Invalid target count');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time))
    throw new InvalidCallToActionError('Invalid date/time');

  const { data, error } = await supabase.rpc('create_call_to_action', {
    p_guild_id: guildId,
    p_title: title,
    p_description: input.description.trim(),
    p_type: input.type,
    p_event_date: `${input.date}T${input.time}:00`,
    p_target_count: input.targetCount,
    p_end_date: buildEndDate(input.date, input.time, input.endTime ?? '') ?? undefined,
  });
  if (error) throw error;
  if (!data) throw new Error('Failed to create call to action');

  return getCallToActionById(data as string);
};
