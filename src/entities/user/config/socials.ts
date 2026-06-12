export const SOCIAL_PLATFORMS = [
  'discord',
  'steam',
  'twitch',
  'telegram',
  'twitter',
  'youtube',
  'battlenet',
  'instagram',
  'facebook',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_META: Record<SocialPlatform, { label: string }> = {
  discord: { label: 'Discord' },
  steam: { label: 'Steam' },
  twitch: { label: 'Twitch' },
  telegram: { label: 'Telegram' },
  twitter: { label: 'Twitter / X' },
  youtube: { label: 'YouTube' },
  battlenet: { label: 'Battle.net' },
  instagram: { label: 'Instagram' },
  facebook: { label: 'Facebook' },
};

export const isSocialPlatform = (v: unknown): v is SocialPlatform =>
  typeof v === 'string' && (SOCIAL_PLATFORMS as readonly string[]).includes(v);
