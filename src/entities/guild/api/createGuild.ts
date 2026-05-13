'use server';
import { createClient } from '@/shared/api/supabase/server';
import { Guild } from '../model/types';

import { redirect } from 'next/navigation';

export const createGuild = async (name: string, description?: string): Promise<Guild> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Unauthorized');

  // Ensure profile exists (fallback for trigger)
  await supabase
    .from('profiles')
    .upsert({ 
      id: user.id,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null
    })
    .select()
    .single();

  // Insert guild
  const { data: guild, error: guildError } = await supabase
    .from('guilds')
    .insert({ name, description, owner_id: user.id })
    .select()
    .single();

  if (guildError || !guild) {
    console.error('Error creating guild:', guildError);
    throw guildError || new Error('Failed to create guild');
  }

  const createdGuild = guild;

  // Insert owner as member
  const { error: memberError } = await supabase
    .from('guild_members')
    .insert({ 
      guild_id: createdGuild.id, 
      user_id: user.id, 
      role: 'OWNER' 
    });

  if (memberError) {
    console.error('Error creating guild member:', memberError);
    throw memberError;
  }

  redirect('/');

  return {
    id: createdGuild.id,
    name: createdGuild.name,
    ownerId: createdGuild.owner_id,
    description: createdGuild.description || undefined,
  };
}
