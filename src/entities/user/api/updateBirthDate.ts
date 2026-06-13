import { createClient } from '@/shared/api/supabase/client';

export const updateBirthDate = async (userId: string, birthDate: string | null) => {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ birth_date: birthDate || null })
    .eq('id', userId);

  if (error) throw error;
};
