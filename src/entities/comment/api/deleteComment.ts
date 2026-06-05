import { createClient } from '@/shared/api/supabase/server';

export const deleteComment = async (commentId: string): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('event_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
};
