import { createClient } from '@/shared/api/supabase/server';
import type { Announcement, UpdateAnnouncementInput } from '../model/types';
import { getAnnouncementById } from './getGuildAnnouncements';
import { InvalidAnnouncementError } from './createAnnouncement';

const MAX_TITLE = 200;
const MAX_CONTENT = 10_000;

export const updateAnnouncement = async (
  announcementId: string,
  input: UpdateAnnouncementInput,
): Promise<Announcement> => {
  const supabase = await createClient();

  const title = input.title.trim();
  if (!title) throw new InvalidAnnouncementError('Title is empty');
  if (title.length > MAX_TITLE) throw new InvalidAnnouncementError('Title is too long');

  const content = input.content.trim();
  if (!content) throw new InvalidAnnouncementError('Content is empty');
  if (content.length > MAX_CONTENT) throw new InvalidAnnouncementError('Content is too long');

  const { error } = await supabase
    .from('announcements')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', announcementId);
  if (error) throw error;

  return getAnnouncementById(announcementId);
};
