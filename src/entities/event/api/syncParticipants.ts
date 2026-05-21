'use server';
import { createClient } from '@/shared/api/supabase/server';

export const syncParticipants = async (eventId: string, userIds: string[]): Promise<void> => {
  const supabase = await createClient();

  const { data: current } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId);

  const currentIds = new Set((current || []).map((r) => r.user_id));
  const newIds = new Set(userIds);

  const toDelete = [...currentIds].filter((id) => !newIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .in('user_id', toDelete);
    if (error) throw error;
  }

  const toInsert = [...newIds].filter((id) => !currentIds.has(id));
  if (toInsert.length > 0) {
    const { error } = await supabase
      .from('event_participants')
      .insert(toInsert.map((user_id) => ({ event_id: eventId, user_id, status: 'pending' })));
    if (error) throw error;
  }
};
