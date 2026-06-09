import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { getPublicProfile } from './getPublicProfile';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

function mockSupabase({ profile, profileError, stats, statsError }: {
  profile?: unknown;
  profileError?: unknown;
  stats?: unknown;
  statsError?: unknown;
}) {
  const supabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile ?? null, error: profileError ?? null }),
    rpc: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: stats ?? null, error: statsError ?? null }),
    }),
  };
  (createClient as MockedFunction<typeof createClient>).mockResolvedValue(
    supabase as unknown as Awaited<ReturnType<typeof createClient>>
  );
  return supabase;
}

describe('getPublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns null when the profile does not exist', async () => {
    mockSupabase({ profile: null });

    expect(await getPublicProfile('missing-id')).toBeNull();
  });

  it('returns null and logs when the profile query fails (e.g. invalid uuid)', async () => {
    mockSupabase({ profileError: { message: 'invalid input syntax for type uuid' } });

    expect(await getPublicProfile('not-a-uuid')).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('returns mapped profile with stats', async () => {
    const supabase = mockSupabase({
      profile: { id: 'user-1', full_name: 'John Doe', avatar_url: 'http://a/b.png' },
      stats: { joined_at: '2025-01-01T00:00:00Z', guilds_count: 3, events_count: 7 },
    });

    expect(await getPublicProfile('user-1')).toEqual({
      id: 'user-1',
      fullName: 'John Doe',
      avatarUrl: 'http://a/b.png',
      joinedAt: '2025-01-01T00:00:00Z',
      guildsCount: 3,
      eventsCount: 7,
    });
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase.rpc).toHaveBeenCalledWith('get_profile_stats', { profile_id: 'user-1' });
  });

  it('returns profile with null stats when the RPC fails', async () => {
    mockSupabase({
      profile: { id: 'user-1', full_name: 'John Doe', avatar_url: null },
      statsError: { message: 'boom' },
    });

    expect(await getPublicProfile('user-1')).toEqual({
      id: 'user-1',
      fullName: 'John Doe',
      avatarUrl: null,
      joinedAt: null,
      guildsCount: null,
      eventsCount: null,
    });
    expect(console.error).toHaveBeenCalled();
  });
});
