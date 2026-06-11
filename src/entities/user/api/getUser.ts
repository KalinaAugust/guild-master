import { cache } from 'react';
import { createClient } from '@/shared/api/supabase/server';
import { User } from '../model/types';

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
  }

  return {
    id: user.id,
    email: user.email,
    profile: profile
      ? {
          id: profile.id,
          publicId: profile.public_id,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          alias: profile.alias,
          displayAsAlias: profile.display_as_alias,
          lastActiveGuildId: profile.last_active_guild_id,
          icon: profile.icon,
        }
      : null,
  };
});
