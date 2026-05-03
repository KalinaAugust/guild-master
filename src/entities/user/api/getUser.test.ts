import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { getUser } from './getUser';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('getUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should return user with profile if authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockProfile = { id: 'user-123', fullName: 'John Doe', avatarUrl: 'http://example.com/avatar.png' };

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
      ...mockUser,
      profile: mockProfile,
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });
});
