import { createClient } from '@/shared/api/supabase/server';

/** Returns the current user's last-read timestamp for a DM conversation with a peer. */
export const getDmReadState = async (
  peerId: string,
): Promise<{ lastReadAt: string | null }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('direct_message_reads')
    .select('last_read_at')
    .eq('user_id', user.id)
    .eq('peer_id', peerId)
    .maybeSingle();

  if (error) throw error;
  return { lastReadAt: data?.last_read_at ?? null };
};
