import { createClient } from '@/shared/api/supabase/server';

/** Marks a guild's announcements as read for the current user (stores `last_read_at`). */
export const markAnnouncementsRead = async (guildId: string): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('announcement_reads')
    .upsert(
      { guild_id: guildId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: 'guild_id,user_id' },
    );
  if (error) throw error;
};
