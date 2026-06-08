import { createClient } from '@/shared/api/supabase/server';

/**
 * Lightweight unread check for the sidebar dot: true when any message from
 * another user is newer than the viewer's last-read timestamp.
 */
export const getGuildChatUnread = async (
  guildId: string,
): Promise<{ hasUnread: boolean }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: read } = await supabase
    .from('guild_message_reads')
    .select('last_read_at')
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .maybeSingle();
  const lastReadAt: string | null = read?.last_read_at ?? null;

  const { data: rows, error } = await supabase
    .from('guild_messages')
    .select('user_id, created_at')
    .eq('guild_id', guildId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const hasUnread = (rows ?? []).some(
    (r: { user_id: string; created_at: string }) =>
      r.user_id !== user.id && (!lastReadAt || r.created_at > lastReadAt),
  );
  return { hasUnread };
};
