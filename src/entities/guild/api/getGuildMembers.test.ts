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
      { user_id: 'u1', role: 'OWNER', profiles: { full_name: 'Alice', avatar_url: 'http://a.com' } },
      { user_id: 'u2', role: 'MEMBER', profiles: { full_name: 'Bob', avatar_url: null } },
    ];
    const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) } as never);

    const result = await getGuildMembers('g1');
    expect(result).toEqual([
      { userId: 'u1', role: 'OWNER', profile: { fullName: 'Alice', avatarUrl: 'http://a.com' } },
      { userId: 'u2', role: 'MEMBER', profile: { fullName: 'Bob', avatarUrl: null } },
    ]);
    expect(eq).toHaveBeenCalledWith('guild_id', 'g1');
  });

  it('handles null profile', async () => {
    const rows = [{ user_id: 'u1', role: 'MEMBER', profiles: null }];
    const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) } as never);

    const result = await getGuildMembers('g1');
    expect(result[0].profile).toEqual({ fullName: null, avatarUrl: null });
  });

  it('returns empty array when no members', async () => {
    const eq = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) } as never);

    const result = await getGuildMembers('g1');
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: new Error('db fail') });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn().mockReturnValue({ select }) } as never);

    await expect(getGuildMembers('g1')).rejects.toThrow('db fail');
  });
});
