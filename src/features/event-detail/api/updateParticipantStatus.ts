'use server';
import { createClient } from '@/shared/api/supabase/server';

export const updateParticipantStatus = async (
  eventId: string,
  status: 'confirmed' | 'declined'
): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('event_participants')
    .update({ status })
    .eq('event_id', eventId)
    .eq('user_id', user.id);

  if (error) throw error;
};
