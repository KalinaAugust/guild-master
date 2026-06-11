import { describe, it, expect } from 'vitest';
import { buildVisibleProfile } from './buildVisibleProfile';
import type { RawProfile } from '../model/types';

const RAW: RawProfile = {
  id: 'user-1',
  publicId: 'a1B2c3D4',
  displayName: 'Johnny',
  icon: 'Sword',
  avatarUrl: 'http://a/b.png',
  fullName: 'John Doe',
  alias: 'Johnny',
  about: 'Hello',
  interests: ['raids'],
  socials: [{ platform: 'discord', value: 'john#1' }],
  privacy: {}, // all defaults
  joinedAt: '2025-01-01',
  guildsCount: 3,
  eventsCount: 7,
};

const COMMON = [{ id: 'g1', name: 'Night Owls', avatarUrl: null }];

describe('buildVisibleProfile', () => {
  it('always includes id, publicId, relationship, displayName, icon, avatarUrl', () => {
    const r = buildVisibleProfile(RAW, 'public', []);
    expect(r).toMatchObject({
      id: 'user-1', publicId: 'a1B2c3D4', relationship: 'public',
      displayName: 'Johnny', icon: 'Sword', avatarUrl: 'http://a/b.png',
    });
  });

  it('anonymous/public viewer sees only public-default fields', () => {
    const r = buildVisibleProfile(RAW, 'public', COMMON);
    // public defaults: alias, about, interests, joined, stats
    expect(r.about).toBe('Hello');
    expect(r.interests).toEqual(['raids']);
    expect(r.alias).toBe('Johnny');
    expect(r.joinedAt).toBe('2025-01-01');
    expect(r.guildsCount).toBe(3);
    expect(r.eventsCount).toBe(7);
    // guildmates-only defaults hidden:
    expect(r).not.toHaveProperty('realName');
    expect(r).not.toHaveProperty('socials');
    expect(r).not.toHaveProperty('commonGuilds');
  });

  it('guildmate sees guildmates-level fields and common guilds', () => {
    const r = buildVisibleProfile(RAW, 'guildmate', COMMON);
    expect(r.realName).toBe('John Doe');
    expect(r.socials).toEqual([{ platform: 'discord', value: 'john#1' }]);
    expect(r.commonGuilds).toEqual(COMMON);
  });

  it('self sees every field but no commonGuilds block', () => {
    const r = buildVisibleProfile(RAW, 'self', []);
    expect(r.realName).toBe('John Doe');
    expect(r.socials).toEqual([{ platform: 'discord', value: 'john#1' }]);
    expect(r).not.toHaveProperty('commonGuilds');
  });

  it('respects explicit privacy overrides', () => {
    const raw = { ...RAW, privacy: { about: 'private' as const, socials: 'public' as const } };
    const pub = buildVisibleProfile(raw, 'public', []);
    expect(pub).not.toHaveProperty('about');
    expect(pub.socials).toEqual([{ platform: 'discord', value: 'john#1' }]);
  });
});
