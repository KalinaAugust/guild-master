// src/features/guild-poll/model/options.test.ts
import { describe, it, expect } from 'vitest';
import { MIN_POLL_OPTIONS, MAX_POLL_OPTIONS, ensureTrailingSlot, countFilled } from './options';

describe('poll options helper', () => {
  it('exposes 2 and 10 as min/max', () => {
    expect(MIN_POLL_OPTIONS).toBe(2);
    expect(MAX_POLL_OPTIONS).toBe(10);
  });

  it('appends an empty trailing slot when the last entry is non-empty', () => {
    expect(ensureTrailingSlot(['A'])).toEqual(['A', '']);
  });

  it('keeps a single trailing empty slot without adding more', () => {
    expect(ensureTrailingSlot(['A', ''])).toEqual(['A', '']);
  });

  it('does not exceed the max cap and drops the trailing slot at cap', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `O${i}`);
    expect(ensureTrailingSlot(ten)).toEqual(ten);
    expect(ensureTrailingSlot([...ten, ''])).toEqual(ten);
  });

  it('counts only non-empty (trimmed) entries', () => {
    expect(countFilled(['A', '  ', 'B', ''])).toBe(2);
  });
});
