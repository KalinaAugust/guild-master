import { describe, it, expect } from 'vitest';
import { createEventFormSchema } from './schema';

const messages = {
  titleRequired: 'Title is required',
  dateRequired: 'Invalid date',
  timeRequired: 'Invalid time',
};

const schema = createEventFormSchema(messages);

const valid = {
  title: 'Raid Night',
  date: '2026-06-01',
  time: '20:00',
  type: 'raid' as const,
  description: '',
};

describe('createEventFormSchema', () => {
  it('passes with valid data', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('fails when title is empty', () => {
    const result = schema.safeParse({ ...valid, title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Title is required');
    }
  });

  it('fails when title exceeds 100 characters', () => {
    const result = schema.safeParse({ ...valid, title: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('fails when date format is wrong', () => {
    const result = schema.safeParse({ ...valid, date: '01-06-2026' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid date');
    }
  });

  it('fails when time format is wrong', () => {
    const result = schema.safeParse({ ...valid, time: '8:00' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid time');
    }
  });

  it('fails when type is not in enum', () => {
    const result = schema.safeParse({ ...valid, type: 'tournament' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid event types', () => {
    const types = ['raid', 'game', 'meeting', 'other', 'dungeon', 'party', 'sport'] as const;
    for (const type of types) {
      expect(schema.safeParse({ ...valid, type }).success).toBe(true);
    }
  });

  it('accepts empty description', () => {
    expect(schema.safeParse({ ...valid, description: '' }).success).toBe(true);
  });
});
