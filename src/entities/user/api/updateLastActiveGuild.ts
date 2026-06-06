import { createClient } from '@/shared/api/supabase/client';

export const updateLastActiveGuild = async (userId: string, guildId: string | null) => {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ last_active_guild_id: guildId })
    .eq('id', userId);

  if (error) throw error;
};
