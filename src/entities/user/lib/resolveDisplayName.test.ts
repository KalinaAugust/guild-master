import { describe, it, expect } from 'vitest';
import { resolveDisplayName } from './resolveDisplayName';

describe('resolveDisplayName', () => {
  it('returns alias when toggle on and alias present', () => {
    expect(resolveDisplayName({ fullName: 'Denis K', alias: 'Elias', displayAsAlias: true }))
      .toBe('Elias');
  });

  it('returns fullName when toggle off', () => {
    expect(resolveDisplayName({ fullName: 'Denis K', alias: 'Elias', displayAsAlias: false }))
      .toBe('Denis K');
  });

  it('falls back to fullName when toggle on but alias empty', () => {
    expect(resolveDisplayName({ fullName: 'Denis K', alias: null, displayAsAlias: true }))
      .toBe('Denis K');
  });

  it('returns null when nothing usable', () => {
    expect(resolveDisplayName({ fullName: null, alias: null, displayAsAlias: false })).toBeNull();
  });
});
