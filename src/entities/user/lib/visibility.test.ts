import { describe, it, expect } from 'vitest';
import { canSee, resolvePrivacy, DEFAULT_PRIVACY } from './visibility';

describe('canSee', () => {
  it('self sees everything regardless of level', () => {
    expect(canSee('private', 'self')).toBe(true);
    expect(canSee('guildmates', 'self')).toBe(true);
    expect(canSee('public', 'self')).toBe(true);
  });

  it('public level is visible to everyone', () => {
    expect(canSee('public', 'guildmate')).toBe(true);
    expect(canSee('public', 'public')).toBe(true);
  });

  it('guildmates level is visible only to self and guildmates', () => {
    expect(canSee('guildmates', 'guildmate')).toBe(true);
    expect(canSee('guildmates', 'public')).toBe(false);
  });

  it('private level is visible only to self', () => {
    expect(canSee('private', 'guildmate')).toBe(false);
    expect(canSee('private', 'public')).toBe(false);
  });
});

describe('resolvePrivacy', () => {
  it('fills missing fields with defaults', () => {
    expect(resolvePrivacy({ about: 'private' })).toEqual({
      ...DEFAULT_PRIVACY,
      about: 'private',
    });
  });

  it('ignores unknown values and falls back to default for that field', () => {
    expect(resolvePrivacy({ name: 'nonsense' as never }).name).toBe(DEFAULT_PRIVACY.name);
  });

  it('returns defaults for null/undefined input', () => {
    expect(resolvePrivacy(null)).toEqual(DEFAULT_PRIVACY);
    expect(resolvePrivacy(undefined)).toEqual(DEFAULT_PRIVACY);
  });
});
