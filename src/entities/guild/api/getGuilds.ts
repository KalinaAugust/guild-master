'use server';
import { createClient } from '@/shared/api/supabase/server';
import { Guild } from '../model/types';

export const getMyGuilds = async (): Promise<Guild[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data, error } = await supabase
    .from('guild_members')
    .select('guild_id, guilds (*)')
    .eq('user_id', user.id);
    
  if (error || !data) {
    console.error('Error fetching guilds:', error);
    return [];
  }
    
  // Map the nested guilds data and ensure it matches the Guild interface
  return data.reduce<Guild[]>((acc, m) => {
    const g = m.guilds as unknown as { id: string; name: string; owner_id: string; description: string | null };
    if (g) {
      acc.push({
        id: g.id,
        name: g.name,
        ownerId: g.owner_id,
        description: g.description || undefined,
      });
    }
    return acc;
  }, []);
}
