import { createClient } from '@/shared/api/supabase/client';

export const updateAvatar = async (userId: string, blob: Blob) => {
  const supabase = createClient();
  const fileName = `avatar-${Date.now()}.png`;
  const filePath = `${userId}/${fileName}`;

  // 1. Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, blob, { upsert: true });

  if (uploadError) throw uploadError;

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // 3. Update Profiles table
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (updateError) {
    // Rollback: delete the uploaded file if database update fails
    await supabase.storage.from('avatars').remove([filePath]);
    throw updateError;
  }

  // 4. Clean up old avatars in the background
  try {
    const { data: files } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (files && files.length > 0) {
      const toDelete = files
        .filter((file) => file.name !== fileName)
        .map((file) => `${userId}/${file.name}`);

      if (toDelete.length > 0) {
        await supabase.storage.from('avatars').remove(toDelete);
      }
    }
  } catch (cleanupError) {
    console.error('Error cleaning up old avatars:', cleanupError);
  }

  return publicUrl;
};
