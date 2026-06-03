import { createClient } from '@/shared/api/supabase/server';
import { createAdminClient } from '@/shared/api/supabase/admin';

/** Thrown when the user cannot apply (already participant / already pending). */
export class JoinRequestConflictError extends Error {}

export const submitEventJoinRequest = async (eventId: string): Promise<{ id: string }> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: existingParticipant } = await db
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingParticipant) throw new JoinRequestConflictError('Already a participant');

  const { data: existingRequest } = await db
    .from('event_join_requests')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (existingRequest) throw new JoinRequestConflictError('Request already pending');

  const { data: request, error } = await db
    .from('event_join_requests')
    .insert({ event_id: eventId, user_id: user.id, status: 'pending' })
    .select('id')
    .single();
  if (error || !request) throw new Error('Failed to create request');

  const { data: event } = await db
    .from('events')
    .select('created_by')
    .eq('id', eventId)
    .single();

  if (event?.created_by) {
    const adminClient = createAdminClient();
    await adminClient.from('notifications').insert({
      user_id: event.created_by,
      type: 'event_join_request',
      entity_type: 'event',
      entity_id: eventId,
    });
  }

  return { id: request.id as string };
};
