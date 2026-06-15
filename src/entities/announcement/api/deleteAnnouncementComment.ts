import { createClient } from '@/shared/api/supabase/server';

export const deleteAnnouncementComment = async (commentId: string): Promise<{ deleted: boolean }> => {
  const supabase = await createClient();
  const { error } = await supabase.from('announcement_comments').delete().eq('id', commentId);
  if (error) throw error;
  return { deleted: true };
};
