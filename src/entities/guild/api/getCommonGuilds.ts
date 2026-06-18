'use server';
import { createClient } from '@/shared/api/supabase/server';
import type { CommonGuild } from '@/shared/types';

export const getCommonGuilds = async (
  viewerId: string | undefined,
  ownerId: string,
): Promise<CommonGuild[]> => {
  if (!viewerId || viewerId === ownerId) return [];

  const supabase = await createClient();

  const { data: viewerRows, error: viewerError } = await supabase
    .from('guild_members')
    .select('guild_id')
    .eq('user_id', viewerId);

  if (viewerError || !viewerRows || viewerRows.length === 0) {
    if (viewerError) console.error('Error fetching viewer guilds:', viewerError);
    return [];
  }

  const viewerGuildIds = viewerRows.map((r) => r.guild_id);

  const { data, error } = await supabase
    .from('guild_members')
    .select('guilds (id, public_id, name, avatar_url)')
    .eq('user_id', ownerId)
    .in('guild_id', viewerGuildIds);

  if (error || !data) {
    console.error('Error fetching common guilds:', error);
    return [];
  }

  return data.reduce<CommonGuild[]>((acc, row) => {
    const g = row.guilds as unknown as { id: string; public_id: string; name: string; avatar_url: string | null } | null;
    if (g) acc.push({ id: g.id, publicId: g.public_id, name: g.name, avatarUrl: g.avatar_url });
    return acc;
  }, []);
};
