import { createClient } from '@/shared/api/supabase/server';
import { GuildMember } from '../model/types';

export const getGuildMembers = async (guildId: string): Promise<GuildMember[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('guild_members')
    .select('user_id, role, profiles(public_id, full_name, avatar_url, alias, display_as_alias)')
    .eq('guild_id', guildId);

  if (error) throw error;

  return (data || []).map((row) => ({
    userId: row.user_id,
    role: row.role as 'OWNER' | 'ADMIN' | 'MEMBER',
    profile: {
      publicId: (row.profiles as { public_id: string | null } | null)?.public_id ?? null,
      fullName: (row.profiles as { full_name: string | null } | null)?.full_name ?? null,
      avatarUrl: (row.profiles as { avatar_url: string | null } | null)?.avatar_url ?? null,
      alias: (row.profiles as { alias: string | null } | null)?.alias ?? null,
      displayAsAlias: (row.profiles as { display_as_alias: boolean | null } | null)?.display_as_alias ?? false,
    },
  }));
};
