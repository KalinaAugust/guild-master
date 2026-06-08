import { createClient } from '@/shared/api/supabase/server';

export const deletePoll = async (pollId: string): Promise<{ deleted: boolean }> => {
  const supabase = await createClient();
  const { error } = await supabase.from('polls').delete().eq('id', pollId);
  if (error) throw error;
  return { deleted: true };
};
