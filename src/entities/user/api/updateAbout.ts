import { createClient } from '@/shared/api/supabase/client';

export const updateAbout = async (userId: string, about: string) => {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ about: about.trim() || null })
    .eq('id', userId);

  if (error) throw error;
};
