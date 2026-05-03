import { createClient } from '@/shared/api/supabase/server';
import { User } from '../model/types';

export const getUser = async (): Promise<User | null> => {
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
          id: (profile as any).id,
          fullName: (profile as any).fullName,
          avatarUrl: (profile as any).avatarUrl,
        }
      : null,
  };
};
