import { createClient } from '@/shared/api/supabase/server';
import type { Announcement } from '../model/types';
import { getAnnouncementById } from './getGuildAnnouncements';

export const setPinned = async (announcementId: string, isPinned: boolean): Promise<Announcement> => {
  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .update({ is_pinned: isPinned })
    .eq('id', announcementId);
  if (error) throw error;
  return getAnnouncementById(announcementId);
};
