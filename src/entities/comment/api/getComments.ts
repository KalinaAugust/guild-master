import { createClient } from '@/shared/api/supabase/server';
import type { EventComment } from '../model/types';
import { COMMENT_SELECT, mapCommentRow } from './mapCommentRow';

export const getComments = async (eventId: string): Promise<EventComment[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('event_comments')
    .select(COMMENT_SELECT)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapCommentRow);
};
