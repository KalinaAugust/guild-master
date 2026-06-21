import { createClient } from '@/shared/api/supabase/server';
import type { ChatScope } from '../model/types';

/** Marks a guild's chat as read for the current user (stores `last_read_at`). */
export const markGuildChatRead = async (
  guildId: string,
  scope: ChatScope = 'all',
): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('guild_message_reads')
    .upsert(
      { guild_id: guildId, user_id: user.id, scope, last_read_at: new Date().toISOString() },
      { onConflict: 'guild_id,user_id,scope' },
    );
  if (error) throw error;
};
