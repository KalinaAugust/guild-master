import {
  type PrivacyField,
  type PrivacyLevel,
  type ProfilePrivacy,
  type SocialLink,
  isSocialPlatform,
  isProfileIcon,
} from '@/entities/user';

export const ABOUT_MAX = 500;
export const INTERESTS_MAX = 10;
export const INTEREST_MAX_LEN = 30;
export const ALIAS_MAX = 30;
export const SOCIAL_VALUE_MAX = 200;

const LEVELS: readonly PrivacyLevel[] = ['private', 'guildmates', 'public'];
const PRIVACY_FIELDS: readonly PrivacyField[] = [
  'name', 'alias', 'about', 'interests', 'socials', 'birth_date', 'joined', 'common_guilds',
];

export interface ProfileSettingsInput {
  alias?: string | null;
  displayAsAlias?: boolean;
  icon?: string | null;
  about?: string | null;
  interests?: string[];
  socials?: SocialLink[];
  birthDate?: string | null;
  privacy?: ProfilePrivacy;
}

/** Matches an ISO calendar date (YYYY-MM-DD), as emitted by `<input type="date">`. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeSettings(input: ProfileSettingsInput): ProfileSettingsInput {
  const out: ProfileSettingsInput = {};

  if ('alias' in input) {
    const a = (input.alias ?? '').trim().slice(0, ALIAS_MAX);
    out.alias = a || null;
  }
  if ('displayAsAlias' in input) out.displayAsAlias = Boolean(input.displayAsAlias);
  if ('icon' in input) out.icon = isProfileIcon(input.icon) ? input.icon : null;
  if ('birthDate' in input) {
    const d = (input.birthDate ?? '').trim();
    out.birthDate = ISO_DATE_RE.test(d) && !Number.isNaN(Date.parse(d)) ? d : null;
  }
  if ('about' in input) {
    const t = (input.about ?? '').trim().slice(0, ABOUT_MAX);
    out.about = t || null;
  }
  if ('interests' in input) {
    out.interests = (input.interests ?? [])
      .map((i) => i.trim().slice(0, INTEREST_MAX_LEN))
      .filter(Boolean)
      .slice(0, INTERESTS_MAX);
  }
  if ('socials' in input) {
    out.socials = (input.socials ?? [])
      .filter((s) => s && isSocialPlatform(s.platform) && s.value.trim())
      .map((s) => ({ platform: s.platform, value: s.value.trim().slice(0, SOCIAL_VALUE_MAX) }));
  }
  if ('privacy' in input) {
    const p: ProfilePrivacy = {};
    const raw = input.privacy ?? {};
    for (const key of PRIVACY_FIELDS) {
      const v = raw[key];
      if (v && LEVELS.includes(v)) p[key] = v;
    }
    out.privacy = p;
  }
  return out;
}
