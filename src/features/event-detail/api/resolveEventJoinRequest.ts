import { createClient } from '@/shared/api/supabase/server';
import { createAdminClient } from '@/shared/api/supabase/admin';

/** Thrown when the caller is not the event creator. */
export class ResolveForbiddenError extends Error {}
/** Thrown when the pending request does not exist. */
export class ResolveNotFoundError extends Error {}

export const resolveEventJoinRequest = async (
  eventId: string,
  requestId: string,
  action: 'approve' | 'decline'
): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: event } = await supabase
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single();
  if (!event || event.created_by !== user.id) throw new ResolveForbiddenError('Forbidden');

  const { data: request } = await supabase
    .from('event_join_requests')
    .select('user_id')
    .eq('id', requestId)
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .maybeSingle();
  if (!request) throw new ResolveNotFoundError('Request not found');

  if (action === 'approve') {
    const { error: insertError } = await supabase
      .from('event_participants')
      .insert({ event_id: eventId, user_id: request.user_id, status: 'confirmed' });
    // Duplicate key (already a participant) is treated as success.
    if (insertError && !insertError.message.includes('duplicate key')) {
      throw insertError;
    }
  }

  const { error: updateError } = await supabase
    .from('event_join_requests')
    .update({ status: action === 'approve' ? 'approved' : 'declined' })
    .eq('id', requestId);
  if (updateError) throw updateError;

  const adminClient = createAdminClient();
  await adminClient.from('notifications').insert({
    user_id: request.user_id,
    type: action === 'approve' ? 'event_join_request_approved' : 'event_join_request_declined',
    entity_type: 'event',
    entity_id: eventId,
  });
};
