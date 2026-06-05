import { createClient } from '@/shared/api/supabase/server';
import type { EventComment } from '../model/types';
import { COMMENT_SELECT, mapCommentRow } from './mapCommentRow';

export const MAX_COMMENT_LENGTH = 2000;

/** Thrown when the comment body is empty or exceeds the length limit. */
export class InvalidCommentError extends Error {}

export const createComment = async (
  eventId: string,
  body: string,
): Promise<EventComment> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidCommentError('Comment is empty');
  if (trimmed.length > MAX_COMMENT_LENGTH) throw new InvalidCommentError('Comment is too long');

  const { data, error } = await supabase
    .from('event_comments')
    .insert({ event_id: eventId, user_id: user.id, body: trimmed })
    .select(COMMENT_SELECT)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to create comment');
  return mapCommentRow(data);
};
