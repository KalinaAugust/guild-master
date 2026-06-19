'use server';
import { createClient } from '@/shared/api/supabase/server';
import { Guild } from '../model/types';
import { revalidatePath } from 'next/cache';

export const getPendingInvites = async (): Promise<Guild[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('guild_members')
    .select('guild_id, guilds (id, public_id, name, owner_id, description, avatar_url, profiles!guilds_owner_id_fkey(public_id, full_name, avatar_url))')
    .eq('user_id', user.id)
    .eq('status', 'PENDING');

  if (error || !data) {
    console.error('Error fetching pending invites:', error);
    return [];
  }
    
  const invites = data.map(m => {
    type ProfileShape = { public_id: string | null; full_name: string | null; avatar_url: string | null } | null;
    const g = m.guilds as unknown as { id: string; public_id: string; name: string; owner_id: string; description: string | null; avatar_url: string | null; profiles: ProfileShape };
    return {
      id: g.id,
      publicId: g.public_id,
      name: g.name,
      ownerId: g.owner_id,
      description: g.description || undefined,
      avatarUrl: g.avatar_url || undefined,
      ownerName: (g.profiles as ProfileShape)?.full_name ?? null,
      ownerAvatarUrl: (g.profiles as ProfileShape)?.avatar_url ?? null,
      ownerPublicId: (g.profiles as ProfileShape)?.public_id ?? null,
    } as Guild;
  }).filter(Boolean);

  // Fetch member counts for these guilds
  if (invites.length > 0) {
    const guildIds = invites.map(g => g.id);
    const { data: countData } = await supabase
      .from('guild_members')
      .select('guild_id')
      .in('guild_id', guildIds)
      .eq('status', 'ACCEPTED');
      
    if (countData) {
      const counts = countData.reduce((acc, curr) => {
        acc[curr.guild_id] = (acc[curr.guild_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      invites.forEach(invite => {
        invite.memberCount = counts[invite.id] || 0;
      });
    }
  }

  return invites;
};

export const acceptInvite = async (guildId: string) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { createAdminClient } = await import('@/shared/api/supabase/admin');
  const adminClient = createAdminClient();

  const { error, data } = await adminClient
    .from('guild_members')
    .update({ status: 'ACCEPTED' })
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .eq('status', 'PENDING')
    .select();

  if (error || !data || data.length === 0) {
    console.error('Error accepting invite:', error);
    return { error: 'Failed to accept invite' };
  }

  revalidatePath('/guilds');
  return { success: true };
};

export const rejectInvite = async (guildId: string) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { createAdminClient } = await import('@/shared/api/supabase/admin');
  const adminClient = createAdminClient();

  const { error, data } = await adminClient
    .from('guild_members')
    .delete()
    .eq('guild_id', guildId)
    .eq('user_id', user.id)
    .eq('status', 'PENDING')
    .select();

  if (error || !data || data.length === 0) {
    console.error('Error rejecting invite:', error);
    return { error: 'Failed to reject invite' };
  }

  revalidatePath('/guilds');
  return { success: true };
};
