import { createClient } from '@/shared/api/supabase/server';
import type { ChatScope } from '../model/types';

/**
 * Lightweight unread check for the sidebar dot: true when at least one message
 * from another user is newer than the viewer's last-read timestamp.
 */
export const getGuildChatUnread = async (
  guildId: string,
  scope: ChatScope = 'all',
): Promise<{ hasUnread: boolean }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: read, error: readError } = await supabase
    .from('guild_message_reads')
    .select('last_read_at')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .eq('scope', scope)
    .maybeSingle();
  if (readError) throw readError;
  const lastReadAt: string | null = read?.last_read_at ?? null;

  let q = supabase
    .from('guild_messages')
    .select('id')
    .eq('guild_id', guildId)
    .eq('scope', scope)
    .neq('user_id', user.id);
  if (lastReadAt) q = q.gt('created_at', lastReadAt);
  const { data: rows, error } = await q.limit(1);
  if (error) throw error;

  return { hasUnread: (rows ?? []).length > 0 };
};
