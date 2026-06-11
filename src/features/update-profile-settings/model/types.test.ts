import { describe, it, expect } from 'vitest';
import { sanitizeSettings, ABOUT_MAX, INTERESTS_MAX } from './types';

describe('sanitizeSettings', () => {
  it('trims and caps about length', () => {
    const out = sanitizeSettings({ about: '  ' + 'x'.repeat(ABOUT_MAX + 50) + '  ' });
    expect(out.about?.length).toBe(ABOUT_MAX);
  });

  it('caps interests count and drops empties', () => {
    const out = sanitizeSettings({
      interests: ['a', '', '  ', ...Array(INTERESTS_MAX + 5).fill('tag')],
    });
    expect(out.interests?.length).toBe(INTERESTS_MAX);
  });

  it('drops socials with unknown platform or empty value', () => {
    const out = sanitizeSettings({
      socials: [
        { platform: 'discord', value: 'john' },
        { platform: 'myspace', value: 'x' },
        { platform: 'steam', value: '' },
      ] as never,
    });
    expect(out.socials).toEqual([{ platform: 'discord', value: 'john' }]);
  });

  it('drops unknown icon and keeps valid one', () => {
    expect(sanitizeSettings({ icon: 'NotAnIcon' }).icon).toBeNull();
    expect(sanitizeSettings({ icon: 'Sword' }).icon).toBe('Sword');
  });

  it('keeps only known privacy fields and valid levels', () => {
    const out = sanitizeSettings({
      privacy: { about: 'private', bogus: 'public', name: 'wrong' } as never,
    });
    expect(out.privacy).toEqual({ about: 'private' });
  });
});
