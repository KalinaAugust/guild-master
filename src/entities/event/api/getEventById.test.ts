import { describe, it, expect, vi } from 'vitest';
import { getEventById } from './getEventById';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

const rawRow = {
  id: 'e1',
  title: 'Morning Raid',
  description: 'Bring potions',
  type: 'raid',
  event_date: '2026-05-28T20:00:00+00:00',
  guild_id: 'g1',
};

function makeSupabaseMock(resolvedValue: unknown) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
  return chain;
}

describe('getEventById', () => {
  it('returns transformed event and guildId when found', async () => {
    const mock = makeSupabaseMock({ data: rawRow, error: null });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getEventById('e1');

    expect(result).not.toBeNull();
    expect(result!.event.id).toBe('e1');
    expect(result!.event.title).toBe('Morning Raid');
    expect(result!.event.type).toBe('raid');
    expect(result!.event.date).toBe('2026-05-28');
    expect(result!.event.time).toBe('20:00');
    expect(result!.event.description).toBe('Bring potions');
    expect(result!.guildId).toBe('g1');
    expect(mock.eq).toHaveBeenCalledWith('id', 'e1');
  });

  it('returns null when event not found', async () => {
    const mock = makeSupabaseMock({ data: null, error: { code: 'PGRST116' } });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getEventById('nonexistent');

    expect(result).toBeNull();
  });

  it('omits description when null', async () => {
    const mock = makeSupabaseMock({ data: { ...rawRow, description: null }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getEventById('e1');

    expect(result!.event.description).toBeUndefined();
  });
});
