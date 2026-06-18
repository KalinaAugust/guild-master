import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { getCommonGuilds } from './getCommonGuilds';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({ createClient: vi.fn() }));

function mockSupabase(rows: unknown, error: unknown = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: rows, error }),
  };
  const supabase = { from: vi.fn().mockReturnValue(builder) };
  (createClient as MockedFunction<typeof createClient>).mockResolvedValue(
    supabase as unknown as Awaited<ReturnType<typeof createClient>>,
  );
  return { supabase, builder };
}

describe('getCommonGuilds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns empty array when there is no viewer', async () => {
    expect(await getCommonGuilds(undefined, 'owner-1')).toEqual([]);
  });

  it('returns empty array when viewer is the owner', async () => {
    expect(await getCommonGuilds('owner-1', 'owner-1')).toEqual([]);
  });

  it('returns guilds shared by both users', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(),
      in: vi.fn(),
    };
    builder.eq
      .mockReturnValueOnce(Promise.resolve({ data: [{ guild_id: 'g1' }, { guild_id: 'g2' }], error: null }))
      .mockReturnThis();
    builder.in.mockResolvedValue({
      data: [{ guilds: { id: 'g2', public_id: 'g2', name: 'Night Owls', avatar_url: null } }],
      error: null,
    });
    const supabase = { from: vi.fn().mockReturnValue(builder) };
    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(
      supabase as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    expect(await getCommonGuilds('viewer-1', 'owner-1')).toEqual([
      { id: 'g2', publicId: 'g2', name: 'Night Owls', avatarUrl: null },
    ]);
  });

  it('returns empty array when viewer has no guilds', async () => {
    const { builder } = mockSupabase(null);
    builder.eq.mockResolvedValueOnce({ data: [], error: null });
    expect(await getCommonGuilds('viewer-1', 'owner-1')).toEqual([]);
  });
});
