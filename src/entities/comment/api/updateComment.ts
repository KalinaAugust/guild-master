import { createClient } from '@/shared/api/supabase/server';
import type { EventComment } from '../model/types';
import { COMMENT_SELECT, mapCommentRow } from './mapCommentRow';
import { InvalidCommentError, MAX_COMMENT_LENGTH } from './createComment';

export const updateComment = async (
  commentId: string,
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
    .update({ body: trimmed, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select(COMMENT_SELECT)
    .single();

  if (error || !data) throw new Error('Failed to update comment');
  return mapCommentRow(data);
};
