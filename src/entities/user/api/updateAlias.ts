import { createClient } from '@/shared/api/supabase/client';

export const updateAlias = async (userId: string, alias: string) => {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ alias: alias.trim() || null })
    .eq('id', userId);

  if (error) throw error;
};
