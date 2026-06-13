import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { getPublicProfile } from './getPublicProfile';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({ createClient: vi.fn() }));

const PROFILE_ROW = {
  id: 'user-1',
  public_id: 'a1B2c3D4',
  full_name: 'John Doe',
  avatar_url: 'http://a/b.png',
  alias: 'Johnny',
  display_as_alias: false,
  icon: 'Sword',
  about: 'Hello',
  interests: ['raids'],
  socials: [{ platform: 'discord', value: 'john#1' }],
  birth_date: '1990-05-20',
  email: 'john@doe.com',
  last_seen_at: '2025-06-01T10:00:00Z',
  privacy: { about: 'public' },
};

function mockSupabase({ profile, profileError, stats, statsError }: {
  profile?: unknown; profileError?: unknown; stats?: unknown; statsError?: unknown;
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
    supabase as unknown as Awaited<ReturnType<typeof createClient>>,
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
    expect(await getPublicProfile('missing')).toBeNull();
  });

  it('returns null and logs when the profile query fails', async () => {
    mockSupabase({ profileError: { message: 'connection error' } });
    expect(await getPublicProfile('a1B2c3D4')).toBeNull();
    expect(console.error).toHaveBeenCalledWith('Error fetching public profile:', { message: 'connection error' });
  });

  it('maps the raw profile + stats, looked up by public_id', async () => {
    const supabase = mockSupabase({
      profile: PROFILE_ROW,
      stats: { joined_at: '2025-01-01' },
    });
    expect(await getPublicProfile('a1B2c3D4')).toEqual({
      id: 'user-1',
      publicId: 'a1B2c3D4',
      displayName: 'John Doe',
      icon: 'Sword',
      avatarUrl: 'http://a/b.png',
      fullName: 'John Doe',
      alias: 'Johnny',
      about: 'Hello',
      interests: ['raids'],
      socials: [{ platform: 'discord', value: 'john#1' }],
      birthDate: '1990-05-20',
      email: 'john@doe.com',
      lastSeenAt: '2025-06-01T10:00:00Z',
      privacy: { about: 'public' },
      joinedAt: '2025-01-01',
    });
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase.eq).toHaveBeenCalledWith('public_id', 'a1B2c3D4');
    expect(supabase.rpc).toHaveBeenCalledWith('get_profile_stats', { profile_id: 'user-1' });
  });

  it('uses alias as displayName when display_as_alias is true', async () => {
    mockSupabase({ profile: { ...PROFILE_ROW, display_as_alias: true }, stats: null });
    const result = await getPublicProfile('a1B2c3D4');
    expect(result?.displayName).toBe('Johnny');
  });

  it('returns null stats and empty collections gracefully when rpc fails / fields null', async () => {
    mockSupabase({
      profile: { ...PROFILE_ROW, interests: null, socials: null, privacy: null },
      statsError: { message: 'boom' },
    });
    const result = await getPublicProfile('a1B2c3D4');
    expect(result).toMatchObject({
      interests: [],
      socials: [],
      privacy: {},
      joinedAt: null,
    });
    expect(console.error).toHaveBeenCalledWith('Error fetching profile stats:', { message: 'boom' });
  });
});
