import { createClient } from '@/shared/api/supabase/server';

export const deleteAnnouncement = async (announcementId: string): Promise<{ deleted: boolean }> => {
  const supabase = await createClient();
  const { error } = await supabase.from('announcements').delete().eq('id', announcementId);
  if (error) throw error;
  return { deleted: true };
};
