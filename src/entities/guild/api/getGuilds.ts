'use server';
import { createClient } from '@/shared/api/supabase/server';
import { Guild } from '../model/types';

export const getMyGuilds = async (userId?: string): Promise<Guild[]> => {
  const supabase = await createClient();
  let finalUserId = userId;

  if (!finalUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    finalUserId = user.id;
  }

  const { data, error } = await supabase
    .from('guild_members')
    .select('guild_id, role, guilds (id, public_id, name, owner_id, description, avatar_url)')
    .eq('user_id', finalUserId)
    .eq('status', 'ACCEPTED');

  if (error || !data) {
    console.error('Error fetching guilds:', error);
    return [];
  }
    
  // Map the nested guilds data and ensure it matches the Guild interface
  return data.reduce<Guild[]>((acc, m) => {
    const g = m.guilds as unknown as { id: string; public_id: string; name: string; owner_id: string; description: string | null; avatar_url: string | null };
    if (g) {
      acc.push({
        id: g.id,
        publicId: g.public_id,
        name: g.name,
        ownerId: g.owner_id,
        description: g.description || undefined,
        avatarUrl: g.avatar_url || undefined,
        role: (m.role as 'OWNER' | 'ADMIN' | 'MEMBER') ?? undefined,
      });
    }
    return acc;
  }, []);
};
