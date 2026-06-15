import { createClient } from '@/shared/api/supabase/server';
import type { AnnouncementComment } from '../model/types';
import { COMMENT_SELECT, mapCommentRow, type AnnouncementCommentRow } from './mapAnnouncementRow';
import { resolveCaller, isManager } from './getGuildAnnouncements';

export const getAnnouncementComments = async (
  announcementId: string,
): Promise<AnnouncementComment[]> => {
  const supabase = await createClient();

  const { data: head, error: headError } = await supabase
    .from('announcements')
    .select('guild_id')
    .eq('id', announcementId)
    .single();
  if (headError) throw headError;

  const { userId, role } = await resolveCaller(supabase, head.guild_id);

  const { data, error } = await supabase
    .from('announcement_comments')
    .select(COMMENT_SELECT)
    .eq('announcement_id', announcementId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return ((data ?? []) as unknown as AnnouncementCommentRow[]).map((row) =>
    mapCommentRow(row, (!!userId && row.user_id === userId) || isManager(role)),
  );
};
