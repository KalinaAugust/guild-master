'use server';
import { createClient } from '@/shared/api/supabase/server';

export const getEventParticipantUserIds = async (eventId: string): Promise<string[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId);

  if (error) throw error;

  return (data || []).map((r) => r.user_id);
};
