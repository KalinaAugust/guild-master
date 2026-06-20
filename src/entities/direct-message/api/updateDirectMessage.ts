import { createClient } from '@/shared/api/supabase/server';
import type { DirectMessage } from '../model/types';
import { DM_SELECT, mapDmRow } from './mapDmRow';
import { InvalidDirectMessageError, MAX_DM_LENGTH } from './createDirectMessage';

export const updateDirectMessage = async (
  messageId: string,
  body: string,
): Promise<DirectMessage> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidDirectMessageError('Message is empty');
  if (trimmed.length > MAX_DM_LENGTH) throw new InvalidDirectMessageError('Message is too long');

  const { data, error } = await supabase
    .from('direct_messages')
    .update({ body: trimmed, updated_at: new Date().toISOString() })
    .eq('id', messageId)
    .select(DM_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to update message');
  return mapDmRow(data);
};
