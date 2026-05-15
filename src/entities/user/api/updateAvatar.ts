import { createClient } from '@/shared/api/supabase/client';

export const updateAvatar = async (userId: string, blob: Blob) => {
  const supabase = createClient();
  const filePath = `${userId}/avatar-${Date.now()}.png`;

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

  if (updateError) throw updateError;

  return publicUrl;
};
