import { cache } from 'react';
import { createClient } from '@/shared/api/supabase/server';
import { PublicProfile } from '../model/types';

export const getPublicProfile = cache(
  async (profileId: string): Promise<PublicProfile | null> => {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', profileId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching public profile:', error);
      return null;
    }
    if (!profile) return null;

    const { data: stats, error: statsError } = await supabase
      .rpc('get_profile_stats', { profile_id: profileId })
      .maybeSingle();

    if (statsError) {
      console.error('Error fetching profile stats:', statsError);
    }

    return {
      id: profile.id,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      joinedAt: stats?.joined_at ?? null,
      guildsCount: stats?.guilds_count ?? null,
      eventsCount: stats?.events_count ?? null,
    };
  }
);
