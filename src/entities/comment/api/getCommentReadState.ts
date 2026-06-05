import { createClient } from '@/shared/api/supabase/server';

/** Returns the current user's last-read timestamp for an event's comments. */
export const getCommentReadState = async (
  eventId: string,
): Promise<{ lastReadAt: string | null }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('event_comment_reads')
    .select('last_read_at')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return { lastReadAt: data?.last_read_at ?? null };
};
