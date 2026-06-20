import { createClient } from '@/shared/api/supabase/server';

export const deleteDirectMessage = async (messageId: string): Promise<void> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Read the attachment URL before deleting so we can clean up its Storage file.
  const { data: existing } = await supabase
    .from('direct_messages')
    .select('attachment_url')
    .eq('id', messageId)
    .maybeSingle();

  const { error } = await supabase
    .from('direct_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;

  // Best-effort removal of the now-orphaned attachment; a failure here must not
  // fail the delete. The path is the part after the public bucket segment.
  const path = existing?.attachment_url?.split('/chat-attachments/')[1];
  if (path) {
    try {
      await supabase.storage.from('chat-attachments').remove([path]);
    } catch {
      // Ignore — the message row is already gone.
    }
  }
};
