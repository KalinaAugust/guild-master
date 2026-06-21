import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { getMyGuilds } from './getGuilds';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('getMyGuilds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should return empty array if user is not authenticated', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase as unknown as never);

    const result = await getMyGuilds();

    expect(result).toEqual([]);
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
  });

  it('should return guilds if user is a member', async () => {
    const mockUser = { id: 'user-123' };
    const mockGuildsData = [
      {
        guild_id: 'guild-1',
        guilds: {
          id: 'guild-1',
          public_id: 'guild-1',
          name: 'First Guild',
          description: 'Description 1',
          avatar_url: 'http://avatar1.com',
          created_at: '2024-01-01',
          owner_id: 'owner-1',
        },
      },
      {
        guild_id: 'guild-2',
        guilds: {
          id: 'guild-2',
          public_id: 'guild-2',
          name: 'Second Guild',
          description: 'Description 2',
          avatar_url: null,
          created_at: '2024-01-02',
          owner_id: 'user-123',
        },
      },
    ];

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockGuildsData, error: null })
      }),
    };
    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase as unknown as never);

    const result = await getMyGuilds();

    expect(result).toEqual([
      {
        id: 'guild-1',
        publicId: 'guild-1',
        name: 'First Guild',
        description: 'Description 1',
        ownerId: 'owner-1',
        avatarUrl: 'http://avatar1.com',
      },
      {
        id: 'guild-2',
        publicId: 'guild-2',
        name: 'Second Guild',
        description: 'Description 2',
        ownerId: 'user-123',
        avatarUrl: undefined,
      },
    ]);
    expect(mockSupabase.from).toHaveBeenCalledWith('guild_members');
    expect(mockSupabase.select).toHaveBeenCalledWith('guild_id, role, guilds (id, public_id, name, owner_id, description, avatar_url, permissions)');
    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
  });

  it('should handle errors gracefully and return empty array', async () => {
    const mockUser = { id: 'user-123' };
    const mockError = { message: 'Database query failed' };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: mockError })
      }),
    };
    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase as unknown as never);

    const result = await getMyGuilds();

    expect(result).toEqual([]);
    expect(console.error).toHaveBeenCalledWith('Error fetching guilds:', mockError);
  });

  it('should filter out null guild entries', async () => {
    const mockUser = { id: 'user-123' };
    const mockGuildsData = [
      {
        guild_id: 'guild-1',
        guilds: { id: 'guild-1', public_id: 'guild-1', name: 'Valid Guild', owner_id: 'owner-1', description: null },
      },
      {
        guild_id: 'guild-2',
        guilds: null, // Should be filtered out
      },
    ];

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockGuildsData, error: null })
      }),
    };
    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase as unknown as never);

    const result = await getMyGuilds();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'guild-1',
      publicId: 'guild-1',
      name: 'Valid Guild',
      ownerId: 'owner-1',
      description: undefined,
      avatarUrl: undefined,
    });
  });

  it('maps the viewer role onto each guild', async () => {
    const mockUser = { id: 'user-123' };
    const mockGuildsData = [
      {
        guild_id: 'g1',
        role: 'ADMIN',
        guilds: { id: 'g1', public_id: 'p1', name: 'G', owner_id: 'o1', description: null, avatar_url: null }
      },
    ];

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockGuildsData, error: null })
      }),
    };
    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase as unknown as never);

    const result = await getMyGuilds('user-123');
    expect(result[0].role).toBe('ADMIN');
  });
});
