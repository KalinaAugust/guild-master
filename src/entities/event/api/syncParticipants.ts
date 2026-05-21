'use server';
import { createClient } from '@/shared/api/supabase/server';

export const syncParticipants = async (eventId: string, userIds: string[]): Promise<void> => {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: current, error: fetchError } = await db
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId);
  if (fetchError) throw fetchError;

  const currentIds = new Set(((current as { user_id: string }[]) || []).map((r) => r.user_id));
  const newIds = new Set(userIds);

  const toDelete = [...currentIds].filter((id) => !newIds.has(id));
  if (toDelete.length > 0) {
    const { error } = await db
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .in('user_id', toDelete);
    if (error) throw error;
  }

  const toInsert = [...newIds].filter((id) => !currentIds.has(id));
  if (toInsert.length > 0) {
    const { error } = await db
      .from('event_participants')
      .insert(toInsert.map((user_id) => ({ event_id: eventId, user_id, status: 'pending' })));
    if (error) throw error;
  }
};
