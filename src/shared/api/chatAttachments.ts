import { createClient } from '@/shared/api/supabase/client';

/**
 * Uploads a chat image to the `chat-attachments` bucket under the user's own
 * folder and returns its public URL. Mirrors the avatar upload flow.
 */
export const uploadChatAttachment = async (userId: string, file: File): Promise<string> => {
  const supabase = createClient();
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(filePath, file, { upsert: false, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(filePath);

  return publicUrl;
};
