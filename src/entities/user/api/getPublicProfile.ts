import { cache } from 'react';
import { createClient } from '@/shared/api/supabase/server';
import { RawProfile, SocialLink, ProfilePrivacy } from '../model/types';
import { resolveDisplayName } from '../lib/resolveDisplayName';

export const getPublicProfile = cache(
  async (publicId: string): Promise<RawProfile | null> => {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        'id, public_id, full_name, avatar_url, alias, display_as_alias, icon, about, interests, socials, birth_date, email, last_seen_at, privacy',
      )
      .eq('public_id', publicId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching public profile:', error);
      return null;
    }
    if (!profile) return null;

    const { data: stats, error: statsError } = await supabase
      .rpc('get_profile_stats', { profile_id: profile.id })
      .maybeSingle();
    if (statsError) console.error('Error fetching profile stats:', statsError);

    return {
      id: profile.id,
      publicId: profile.public_id,
      displayName: resolveDisplayName({
        fullName: profile.full_name,
        alias: profile.alias,
        displayAsAlias: profile.display_as_alias,
      }),
      icon: profile.icon,
      avatarUrl: profile.avatar_url,
      fullName: profile.full_name,
      alias: profile.alias,
      about: profile.about,
      interests: (profile.interests as string[]) ?? [],
      socials: (profile.socials as unknown as SocialLink[]) ?? [],
      birthDate: profile.birth_date ?? null,
      email: profile.email ?? null,
      lastSeenAt: profile.last_seen_at ?? null,
      privacy: (profile.privacy as ProfilePrivacy) ?? {},
      joinedAt: stats?.joined_at ?? null,
    };
  },
);
