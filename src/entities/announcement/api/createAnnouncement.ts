import { createClient } from '@/shared/api/supabase/server';
import type { Announcement, CreateAnnouncementInput } from '../model/types';
import { getAnnouncementById } from './getGuildAnnouncements';

const MAX_TITLE = 200;
const MAX_CONTENT = 10_000;

/** Thrown when announcement input is invalid (empty/too-long title or content). */
export class InvalidAnnouncementError extends Error {}

export const createAnnouncement = async (
  guildId: string,
  input: CreateAnnouncementInput,
): Promise<Announcement> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const title = input.title.trim();
  if (!title) throw new InvalidAnnouncementError('Title is empty');
  if (title.length > MAX_TITLE) throw new InvalidAnnouncementError('Title is too long');

  const content = input.content.trim();
  if (!content) throw new InvalidAnnouncementError('Content is empty');
  if (content.length > MAX_CONTENT) throw new InvalidAnnouncementError('Content is too long');

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      guild_id: guildId,
      created_by: user.id,
      title,
      content,
      is_pinned: input.isPinned,
    })
    .select('id')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Failed to create announcement');

  return getAnnouncementById(data.id);
};
