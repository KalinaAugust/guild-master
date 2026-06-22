import { describe, it, expect } from 'vitest';
import { buildEndDate, deriveEnd } from './eventInterval';

describe('buildEndDate', () => {
  it('returns null when end time is empty', () => {
    expect(buildEndDate('2026-06-22', '19:00', '')).toBeNull();
  });
  it('builds a same-day end when end is after start', () => {
    expect(buildEndDate('2026-06-22', '19:00', '21:00')).toBe('2026-06-22T21:00:00');
  });
  it('rolls to next day when end <= start', () => {
    expect(buildEndDate('2026-06-22', '23:00', '01:00')).toBe('2026-06-23T01:00:00');
    expect(buildEndDate('2026-06-22', '19:00', '19:00')).toBe('2026-06-23T19:00:00');
  });
});

describe('deriveEnd', () => {
  it('returns empty object when end is null', () => {
    expect(deriveEnd('2026-06-22T19:00:00Z', null)).toEqual({});
  });
  it('derives same-day end', () => {
    expect(deriveEnd('2026-06-22T19:00:00Z', '2026-06-22T21:00:00Z')).toEqual({
      endTime: '21:00',
      endsNextDay: false,
    });
  });
  it('flags next-day end', () => {
    expect(deriveEnd('2026-06-22T23:00:00Z', '2026-06-23T01:00:00Z')).toEqual({
      endTime: '01:00',
      endsNextDay: true,
    });
  });
});
