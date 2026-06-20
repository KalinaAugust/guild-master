import { createClient } from '@/shared/api/supabase/server';
import type { DirectMessage } from '../model/types';
import { DM_SELECT, mapDmRow } from './mapDmRow';

export const MAX_DM_LENGTH = 2000;

/** Thrown when the message body is empty or exceeds the length limit. */
export class InvalidDirectMessageError extends Error {}

export const createDirectMessage = async (
  peerId: string,
  body: string,
  attachmentUrl?: string | null,
): Promise<DirectMessage> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  // A message must carry text or an attachment (or both).
  if (!trimmed && !attachmentUrl) throw new InvalidDirectMessageError('Message is empty');
  if (trimmed.length > MAX_DM_LENGTH) throw new InvalidDirectMessageError('Message is too long');

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({ sender_id: user.id, recipient_id: peerId, body: trimmed, attachment_url: attachmentUrl ?? null })
    .select(DM_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create message');
  return mapDmRow(data);
};
