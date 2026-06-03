import { createClient } from '@/shared/api/supabase/server';

/** Event creator adds themselves to the event as a confirmed participant. */
export const addSelfAsParticipant = async (eventId: string): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('event_participants')
    .insert({ event_id: eventId, user_id: user.id, status: 'confirmed' });

  // Duplicate key (already a participant) is treated as success.
  if (error && !error.message.includes('duplicate key')) throw error;
};
