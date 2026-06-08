import { createClient } from '@/shared/api/supabase/server';
import type { GuildMessage } from '../model/types';
import { MESSAGE_SELECT, mapMessageRow } from './mapMessageRow';

export const MAX_MESSAGE_LENGTH = 2000;

/** Thrown when the message body is empty or exceeds the length limit. */
export class InvalidGuildMessageError extends Error {}

export const createGuildMessage = async (
  guildId: string,
  body: string,
): Promise<GuildMessage> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidGuildMessageError('Message is empty');
  if (trimmed.length > MAX_MESSAGE_LENGTH) throw new InvalidGuildMessageError('Message is too long');

  const { data, error } = await supabase
    .from('guild_messages')
    .insert({ guild_id: guildId, user_id: user.id, body: trimmed })
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create message');
  return mapMessageRow(data);
};
