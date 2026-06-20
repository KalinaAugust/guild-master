import { createClient } from '@/shared/api/supabase/server';

/**
 * Aggregate unread check for the sidebar dot: true when at least one DM where the
 * current user is the recipient is newer than that conversation's last_read_at.
 */
export const getDmUnread = async (): Promise<{ hasUnread: boolean }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // All read cursors for this user, keyed by peer.
  const { data: reads, error: readsError } = await supabase
    .from('direct_message_reads')
    .select('peer_id, last_read_at')
    .eq('user_id', user.id);
  if (readsError) throw readsError;
  const readByPeer = new Map((reads ?? []).map((r) => [r.peer_id, r.last_read_at]));

  // Newest incoming message per sender (small N; fetch recent inbound and reduce).
  const { data: rows, error } = await supabase
    .from('direct_messages')
    .select('sender_id, created_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  const seen = new Set<string>();
  for (const r of rows ?? []) {
    if (seen.has(r.sender_id)) continue;
    seen.add(r.sender_id);
    const lastRead = readByPeer.get(r.sender_id);
    if (!lastRead || r.created_at > lastRead) return { hasUnread: true };
  }
  return { hasUnread: false };
};
