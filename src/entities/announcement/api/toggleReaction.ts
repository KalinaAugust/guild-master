import { createClient } from '@/shared/api/supabase/server';
import type { Announcement, ReactionType } from '../model/types';
import { REACTION_TYPES } from '../model/types';
import { getAnnouncementById } from './getGuildAnnouncements';
import { InvalidAnnouncementError } from './createAnnouncement';

export const toggleReaction = async (
  announcementId: string,
  type: ReactionType,
): Promise<Announcement> => {
  if (!REACTION_TYPES.includes(type)) throw new InvalidAnnouncementError('Invalid reaction type');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Toggle: delete the existing (user, type) row, or insert it if absent.
  const { data: existing, error: selError } = await supabase
    .from('announcement_reactions')
    .select('id')
    .eq('announcement_id', announcementId)
    .eq('user_id', user.id)
    .eq('type', type)
    .maybeSingle();
  if (selError) throw selError;

  if (existing) {
    const { error } = await supabase.from('announcement_reactions').delete().eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('announcement_reactions')
      .insert({ announcement_id: announcementId, user_id: user.id, type });
    if (error) throw error;
  }

  return getAnnouncementById(announcementId);
};
