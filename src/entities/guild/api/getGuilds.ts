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
    
  if (error) {
    console.error('Error fetching guilds:', error);
    return [];
  }
    
  // Map the nested guilds data and ensure it matches the Guild interface
  return ((data as any[])?.map(m => {
    if (!m.guilds) return null;
    return {
      id: m.guilds.id,
      name: m.guilds.name,
      ownerId: m.guilds.owner_id,
      description: m.guilds.description,
    };
  }).filter(Boolean) as Guild[]) || [];
}
