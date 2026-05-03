'use server';
import { createClient } from '@/shared/api/supabase/server';
import { Guild } from '../model/types';

export const createGuild = async (name: string, description?: string): Promise<Guild> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');

  // Insert guild
  const { data: guild, error: guildError } = await supabase
    .from('guilds')
    .insert({ name, description, ownerId: user.id })
    .select()
    .single();

  if (guildError) {
    console.error('Error creating guild:', guildError);
    throw guildError;
  }

  // Insert owner as member
  const { error: memberError } = await supabase
    .from('guild_members')
    .insert({ 
      guild_id: guild.id, 
      user_id: user.id, 
      role: 'owner' 
    });

  if (memberError) {
    console.error('Error creating guild member:', memberError);
    throw memberError;
  }

  return guild as Guild;
}
