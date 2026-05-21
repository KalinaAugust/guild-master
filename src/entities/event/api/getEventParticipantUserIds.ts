'use server';
import { createClient } from '@/shared/api/supabase/server';

export const getEventParticipantUserIds = async (eventId: string): Promise<string[]> => {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId);

  if (error) throw error;

  return ((data as { user_id: string }[]) || []).map((r) => r.user_id);
};
