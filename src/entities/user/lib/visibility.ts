import type {
  PrivacyField,
  PrivacyLevel,
  ProfilePrivacy,
  ViewerRelationship,
} from '../model/types';

export const DEFAULT_PRIVACY: Required<ProfilePrivacy> = {
  name: 'guildmates',
  alias: 'public',
  about: 'public',
  interests: 'public',
  socials: 'guildmates',
  joined: 'public',
  stats: 'public',
  common_guilds: 'guildmates',
};

const LEVELS: readonly PrivacyLevel[] = ['private', 'guildmates', 'public'];

export function canSee(level: PrivacyLevel, relationship: ViewerRelationship): boolean {
  if (relationship === 'self') return true;
  if (level === 'public') return true;
  if (level === 'guildmates') return relationship === 'guildmate';
  return false;
}

export function resolvePrivacy(raw: ProfilePrivacy | null | undefined): Required<ProfilePrivacy> {
  const result = { ...DEFAULT_PRIVACY };
  if (!raw || typeof raw !== 'object') return result;
  for (const key of Object.keys(DEFAULT_PRIVACY) as PrivacyField[]) {
    const value = raw[key];
    if (value && LEVELS.includes(value)) result[key] = value;
  }
  return result;
}
