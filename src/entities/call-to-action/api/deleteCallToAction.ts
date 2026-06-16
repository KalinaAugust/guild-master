import { createClient } from '@/shared/api/supabase/server';

export const deleteCallToAction = async (id: string): Promise<void> => {
  const supabase = await createClient();
  const { error } = await supabase.from('call_to_actions').delete().eq('id', id);
  if (error) throw error;
};
