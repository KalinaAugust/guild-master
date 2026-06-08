import { createClient } from '@/shared/api/supabase/server';

/** Returns the current user's last-read timestamp for a guild's chat. */
export const getGuildChatReadState = async (
  guildId: string,
): Promise<{ lastReadAt: string | null }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('guild_message_reads')
    .select('last_read_at')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return { lastReadAt: data?.last_read_at ?? null };
};
