export const PROFILE_ICONS = [
  'Sword',
  'Shield',
  'Crown',
  'Gamepad2',
  'Skull',
  'Heart',
  'Star',
  'Zap',
  'Flame',
  'Sparkles',
  'Ghost',
  'Rocket',
] as const;

export type ProfileIcon = (typeof PROFILE_ICONS)[number];

export const isProfileIcon = (v: unknown): v is ProfileIcon =>
  typeof v === 'string' && (PROFILE_ICONS as readonly string[]).includes(v);
