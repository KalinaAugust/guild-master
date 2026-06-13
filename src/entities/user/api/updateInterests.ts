import { createClient } from '@/shared/api/supabase/client';

export const updateInterests = async (userId: string, interests: string[]) => {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ interests })
    .eq('id', userId);

  if (error) throw error;
};
