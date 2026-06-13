export const PROFILE_ICONS = [
  // Original set
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
  // Sport
  'Trophy',
  'Medal',
  'Dumbbell',
  'Bike',
  'Target',
  'Mountain',
  'Volleyball',
  // Hobbies & interests
  'Music',
  'Headphones',
  'Guitar',
  'Camera',
  'Palette',
  'Gem',
  'Compass',
  'Anchor',
  'Leaf',
  'Moon',
  'Coffee',
  'Dices',
  'Brain',
  'Cat',
  'Dog',
  'Bird',
] as const;

export type ProfileIcon = (typeof PROFILE_ICONS)[number];

export const isProfileIcon = (v: unknown): v is ProfileIcon =>
  typeof v === 'string' && (PROFILE_ICONS as readonly string[]).includes(v);
