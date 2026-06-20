import { createClient } from '@/shared/api/supabase/server';

/** Marks a DM conversation with a peer as read for the current user (stores `last_read_at`). */
export const markDmRead = async (peerId: string): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('direct_message_reads')
    .upsert(
      { user_id: user.id, peer_id: peerId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,peer_id' },
    );
  if (error) throw error;
};
