import { createClient } from '@/shared/api/supabase/server';
import type { GuildMessage } from '../model/types';
import { MESSAGE_SELECT, mapMessageRow } from './mapMessageRow';

export const getGuildMessages = async (guildId: string): Promise<GuildMessage[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('guild_messages')
    .select(MESSAGE_SELECT)
    .eq('guild_id', guildId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMessageRow);
};
