import { createClient } from '@/shared/api/supabase/client';

export const updateFullName = async (userId: string, fullName: string) => {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', userId);

  if (error) throw error;
};
