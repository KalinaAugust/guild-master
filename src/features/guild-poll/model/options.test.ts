// src/features/guild-poll/model/options.test.ts
import { describe, it, expect } from 'vitest';
import { MIN_POLL_OPTIONS, MAX_POLL_OPTIONS, countFilled } from './options';

describe('poll options helper', () => {
  it('exposes 2 and 10 as min/max', () => {
    expect(MIN_POLL_OPTIONS).toBe(2);
    expect(MAX_POLL_OPTIONS).toBe(10);
  });

  it('counts only non-empty (trimmed) entries', () => {
    expect(countFilled(['A', '  ', 'B', ''])).toBe(2);
  });
});
