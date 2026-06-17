import { describe, it, expect } from 'vitest';
import { createCtaFormSchema } from './schema';

const msgs = { titleRequired: 'tr', dateRequired: 'dr', timeRequired: 'tir', targetMin: 'tm' };
const schema = createCtaFormSchema(msgs);
const base = { title: 'Raid', date: '2026-07-01', time: '19:00', type: 'game', description: '', targetCount: 5 };

describe('createCtaFormSchema', () => {
  it('accepts a valid payload', () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(schema.safeParse({ ...base, title: '' }).success).toBe(false);
  });

  it('rejects targetCount below 1', () => {
    expect(schema.safeParse({ ...base, targetCount: 0 }).success).toBe(false);
  });

  it('coerces a numeric string targetCount', () => {
    const r = schema.safeParse({ ...base, targetCount: '4' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.targetCount).toBe(4);
  });

  it('rejects a malformed date', () => {
    expect(schema.safeParse({ ...base, date: '07/01/2026' }).success).toBe(false);
  });
});
