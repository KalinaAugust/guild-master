import { createClient } from '@/shared/api/supabase/client';

const BUCKET = 'guild-avatars';

/**
 * Uploads a guild avatar to Storage and returns its public URL.
 * The guild must already exist (the storage policy keys on guild ownership),
 * so for the create flow this runs after the guild has been created.
 */
export const uploadGuildAvatar = async (guildId: string, blob: Blob): Promise<string> => {
  const supabase = createClient();
  const fileName = `avatar-${Date.now()}.png`;
  const filePath = `${guildId}/${fileName}`;

  // 1. Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, blob, { upsert: true });

  if (uploadError) throw uploadError;

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  // 3. Clean up old avatars in the background
  try {
    const { data: files } = await supabase.storage.from(BUCKET).list(guildId);

    if (files && files.length > 0) {
      const toDelete = files
        .filter((file) => file.name !== fileName)
        .map((file) => `${guildId}/${file.name}`);

      if (toDelete.length > 0) {
        await supabase.storage.from(BUCKET).remove(toDelete);
      }
    }
  } catch (cleanupError) {
    console.error('Error cleaning up old guild avatars:', cleanupError);
  }

  return publicUrl;
};
