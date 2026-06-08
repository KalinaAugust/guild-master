import { createClient } from '@/shared/api/supabase/server';
import type { GuildMessage } from '../model/types';
import { MESSAGE_SELECT, mapMessageRow } from './mapMessageRow';
import { InvalidGuildMessageError, MAX_MESSAGE_LENGTH } from './createGuildMessage';

export const updateGuildMessage = async (
  messageId: string,
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
    .update({ body: trimmed, updated_at: new Date().toISOString() })
    .eq('id', messageId)
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to update message');
  return mapMessageRow(data);
};
