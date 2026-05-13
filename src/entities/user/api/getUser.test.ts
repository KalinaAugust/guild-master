import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { getUser } from './getUser';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('getUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should return null if user is not authenticated', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getUser();

    expect(result).toBeNull();
  });

  it('should return user with mapped profile if authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockProfile = { 
      id: 'user-123', 
      full_name: 'John Doe', 
      avatar_url: 'http://example.com/avatar.png',
      extra_field: 'should be mapped away' 
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    };
    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getUser();

    expect(result).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      profile: {
        id: mockProfile.id,
        fullName: mockProfile.full_name,
        avatarUrl: mockProfile.avatar_url,
      },
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });

  it('should log error and return user with null profile if profile fetch fails', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockError = { message: 'Database error' };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    };
    (createClient as MockedFunction<typeof createClient>).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await getUser();

    expect(result).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      profile: null,
    });
    expect(console.error).toHaveBeenCalledWith('Error fetching user profile:', mockError);
  });
});
