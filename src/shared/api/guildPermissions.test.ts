import { describe, it, expect } from 'vitest';
import { canPerform, resolveLevel, DEFAULT_PERMISSIONS } from './guildPermissions';

describe('resolveLevel', () => {
  it('falls back to defaults for null permissions', () => {
    expect(resolveLevel(null, 'events')).toBe('officers');
    expect(resolveLevel(null, 'polls')).toBe('all');
  });
  it('falls back to default for a missing key', () => {
    expect(resolveLevel({ events: 'owner' }, 'polls')).toBe('all');
  });
  it('uses an explicit value when present', () => {
    expect(resolveLevel({ polls: 'officers' }, 'polls')).toBe('officers');
  });
});

describe('canPerform', () => {
  it("level 'all' lets a MEMBER act", () => {
    expect(canPerform({ events: 'all' }, 'events', 'MEMBER')).toBe(true);
  });
  it("level 'officers' blocks a MEMBER, allows ADMIN/OWNER", () => {
    expect(canPerform({ events: 'officers' }, 'events', 'MEMBER')).toBe(false);
    expect(canPerform({ events: 'officers' }, 'events', 'ADMIN')).toBe(true);
    expect(canPerform({ events: 'officers' }, 'events', 'OWNER')).toBe(true);
  });
  it("level 'owner' allows only OWNER", () => {
    expect(canPerform({ events: 'owner' }, 'events', 'ADMIN')).toBe(false);
    expect(canPerform({ events: 'owner' }, 'events', 'OWNER')).toBe(true);
  });
  it('applies defaults: polls default all, announcements default officers', () => {
    expect(canPerform(null, 'polls', 'MEMBER')).toBe(true);
    expect(canPerform(null, 'announcements', 'MEMBER')).toBe(false);
  });
  it('a null/unknown role can never act', () => {
    expect(canPerform({ events: 'all' }, 'events', null)).toBe(false);
    expect(canPerform({ events: 'all' }, 'events', 'GUEST')).toBe(false);
  });
  it('DEFAULT_PERMISSIONS preserves current behavior', () => {
    expect(DEFAULT_PERMISSIONS).toEqual({
      events: 'officers', announcements: 'officers', polls: 'all', call_to_actions: 'all',
    });
  });
});
