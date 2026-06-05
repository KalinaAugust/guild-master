import { createClient } from '@/shared/api/supabase/server';

/**
 * Marks an event's comments as read for the current user: stores `last_read_at`
 * and clears their unread `event_comment` notifications for that event.
 */
export const markCommentsRead = async (eventId: string): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('event_comment_reads')
    .upsert(
      { event_id: eventId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' },
    );
  if (error) throw error;

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('type', 'event_comment')
    .eq('entity_id', eventId)
    .eq('is_read', false);
};
