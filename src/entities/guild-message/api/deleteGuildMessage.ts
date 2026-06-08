import { createClient } from '@/shared/api/supabase/server';

export const deleteGuildMessage = async (messageId: string): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('guild_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
};
