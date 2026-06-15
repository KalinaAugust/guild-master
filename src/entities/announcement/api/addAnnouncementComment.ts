import { createClient } from '@/shared/api/supabase/server';
import type { AnnouncementComment } from '../model/types';
import { COMMENT_SELECT, mapCommentRow, type AnnouncementCommentRow } from './mapAnnouncementRow';
import { InvalidAnnouncementError } from './createAnnouncement';

const MAX_COMMENT = 2000;

export const addAnnouncementComment = async (
  announcementId: string,
  body: string,
): Promise<AnnouncementComment> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const trimmed = body.trim();
  if (!trimmed) throw new InvalidAnnouncementError('Comment is empty');
  if (trimmed.length > MAX_COMMENT) throw new InvalidAnnouncementError('Comment is too long');

  const { data, error } = await supabase
    .from('announcement_comments')
    .insert({ announcement_id: announcementId, user_id: user.id, body: trimmed })
    .select(COMMENT_SELECT)
    .single();
  if (error) throw error;
  if (!data) throw new Error('Failed to create comment');

  // The author can always delete their own comment.
  return mapCommentRow(data as unknown as AnnouncementCommentRow, true);
};
