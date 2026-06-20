import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGuildMembers } from './getGuildMembers';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('getGuildMembers', () => {
  it('maps rows to GuildMember shape', async () => {
    const rows = [
      { user_id: 'u1', role: 'OWNER', profiles: { public_id: 'pubA', full_name: 'Alice', avatar_url: 'http://a.com', alias: 'Ali', display_as_alias: true, icon: 'Sword', about: 'Founder' } },
      { user_id: 'u2', role: 'MEMBER', profiles: { public_id: 'pubB', full_name: 'Bob', avatar_url: null, alias: null, display_as_alias: false, icon: null, about: null } },
    ];
    const mockDb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockDb as never);

    const result = await getGuildMembers('g1');
    expect(result).toEqual([
      { userId: 'u1', role: 'OWNER', profile: { publicId: 'pubA', fullName: 'Alice', avatarUrl: 'http://a.com', alias: 'Ali', displayAsAlias: true, icon: 'Sword', about: 'Founder' } },
      { userId: 'u2', role: 'MEMBER', profile: { publicId: 'pubB', fullName: 'Bob', avatarUrl: null, alias: null, displayAsAlias: false, icon: null, about: null } },
    ]);
    expect(mockDb.eq).toHaveBeenCalledWith('guild_id', 'g1');
  });

  it('handles null profile', async () => {
    const rows = [{ user_id: 'u1', role: 'MEMBER', profiles: null }];
    const mockDb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockDb as never);

    const result = await getGuildMembers('g1');
    expect(result[0].profile).toEqual({ publicId: null, fullName: null, avatarUrl: null, alias: null, displayAsAlias: false, icon: null, about: null });
  });

  it('returns empty array when no members', async () => {
    const mockDb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockDb as never);

    const result = await getGuildMembers('g1');
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    const mockDb = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: new Error('db fail') }),
      }),
    };
    vi.mocked(createClient).mockResolvedValue(mockDb as never);

    await expect(getGuildMembers('g1')).rejects.toThrow('db fail');
  });
});
