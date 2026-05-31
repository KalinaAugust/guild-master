import { createClient } from '@/shared/api/supabase/server';

export const deleteEvent = async (id: string) => {
  const supabase = await createClient();
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
  return true;
};
