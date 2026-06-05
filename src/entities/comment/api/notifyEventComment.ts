import { createAdminClient } from '@/shared/api/supabase/admin';

/**
 * Best-effort notification fan-out for a new comment. Notifies the event
 * creator and confirmed participants (except the author), deduplicated so a
 * recipient who still has an unread `event_comment` notification for this event
 * is not notified again.
 */
export const notifyEventComment = async (eventId: string, authorId: string): Promise<void> => {
  const admin = createAdminClient();

  const { data: event } = await admin
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single();

  const { data: confirmed } = await admin
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmed');

  const recipients = new Set<string>();
  if (event?.created_by) recipients.add(event.created_by);
  (confirmed ?? []).forEach((p) => p.user_id && recipients.add(p.user_id));
  recipients.delete(authorId);
  if (recipients.size === 0) return;

  const { data: existing } = await admin
    .from('notifications')
    .select('user_id')
    .eq('type', 'event_comment')
    .eq('entity_id', eventId)
    .eq('is_read', false)
    .in('user_id', [...recipients]);
  (existing ?? []).forEach((n) => recipients.delete(n.user_id));
  if (recipients.size === 0) return;

  await admin.from('notifications').insert(
    [...recipients].map((user_id) => ({
      user_id,
      type: 'event_comment',
      entity_type: 'event',
      entity_id: eventId,
    })),
  );
};
