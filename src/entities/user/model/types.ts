import type { SocialPlatform } from '../config/socials';
import type { CommonGuild } from '@/shared/types';

export type { CommonGuild };

export type PrivacyLevel = 'private' | 'guildmates' | 'public';

export type PrivacyField =
  | 'name'
  | 'alias'
  | 'about'
  | 'interests'
  | 'socials'
  | 'birth_date'
  | 'email'
  | 'joined'
  | 'common_guilds';

export type ProfilePrivacy = Partial<Record<PrivacyField, PrivacyLevel>>;

export type ViewerRelationship = 'self' | 'guildmate' | 'public';

export interface SocialLink {
  platform: SocialPlatform;
  value: string;
}

export interface UserProfile {
  id: string;
  publicId: string;
  fullName: string | null;
  avatarUrl: string | null;
  lastActiveGuildId?: string | null;
  alias?: string | null;
  displayAsAlias?: boolean;
  icon?: string | null;
}

export interface User {
  id: string;
  email?: string;
  profile: UserProfile | null;
}

export interface PublicProfile {
  id: string;
  publicId: string;
  relationship: ViewerRelationship;
  /** Resolved display name (alias when toggle on, else full_name). Always present. */
  displayName: string | null;
  /** lucide icon name shown after the name. No privacy. */
  icon: string | null;
  avatarUrl: string | null;
  // Fields below are present only when visible to the viewer:
  realName?: string | null;
  alias?: string | null;
  about?: string | null;
  interests?: string[];
  socials?: SocialLink[];
  birthDate?: string | null;
  birthDateShowYear?: boolean;
  email?: string | null;
  /** Presence timestamp; not privacy-gated (shown to everyone). */
  lastSeenAt?: string | null;
  joinedAt?: string | null;
  commonGuilds?: CommonGuild[];
}

/**
 * Unfiltered profile data fetched from the DB plus stats and the resolved
 * display name. Visibility is applied later by `buildVisibleProfile` in the
 * composition layer; this type carries every field regardless of privacy.
 */
export interface RawProfile {
  id: string;
  publicId: string;
  displayName: string | null;
  icon: string | null;
  avatarUrl: string | null;
  fullName: string | null;
  alias: string | null;
  about: string | null;
  interests: string[];
  socials: SocialLink[];
  birthDate: string | null;
  birthDateShowYear: boolean;
  email: string | null;
  lastSeenAt: string | null;
  privacy: ProfilePrivacy;
  joinedAt: string | null;
}
