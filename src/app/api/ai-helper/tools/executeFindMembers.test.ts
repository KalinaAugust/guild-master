import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeFindMembers } from './executeFindMembers';
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';

vi.mock('@/entities/guild/api/getGuildMembers');

const member = (over: Partial<{ userId: string; fullName: string | null; alias: string | null; displayAsAlias: boolean }>) => ({
  userId: over.userId ?? 'u1',
  role: 'MEMBER' as const,
  profile: {
    publicId: 'p1',
    fullName: over.fullName ?? 'Alice Smith',
    avatarUrl: null,
    alias: over.alias ?? null,
    displayAsAlias: over.displayAsAlias ?? false,
    icon: null,
    about: null,
  },
});

describe('executeFindMembers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all members with derived display name when no keyword', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue([
      member({ userId: 'u1', fullName: 'Alice Smith' }),
      member({ userId: 'u2', fullName: 'Bob Jones', alias: 'bobby' }),
    ] as never);
    const result = await executeFindMembers({}, 'g1');
    expect(result).toEqual({
      members: [
        { userId: 'u1', name: 'Alice Smith', alias: null },
        { userId: 'u2', name: 'Bob Jones', alias: 'bobby' },
      ],
    });
  });

  it('prefers alias when displayAsAlias is true', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue([
      member({ userId: 'u2', fullName: 'Bob Jones', alias: 'bobby', displayAsAlias: true }),
    ] as never);
    const result = await executeFindMembers({}, 'g1');
    expect(result.members[0]).toEqual({ userId: 'u2', name: 'bobby', alias: 'bobby' });
  });

  it('filters by keyword over name and alias, case-insensitive', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue([
      member({ userId: 'u1', fullName: 'Alice Smith' }),
      member({ userId: 'u2', fullName: 'Bob Jones', alias: 'dragonborn' }),
    ] as never);
    const byName = await executeFindMembers({ keyword: 'alice' }, 'g1');
    expect(byName.members.map((m) => m.userId)).toEqual(['u1']);
    const byAlias = await executeFindMembers({ keyword: 'DRAGON' }, 'g1');
    expect(byAlias.members.map((m) => m.userId)).toEqual(['u2']);
  });

  it('returns empty members with error on failure', async () => {
    vi.mocked(getGuildMembers).mockRejectedValue(new Error('db error'));
    const result = await executeFindMembers({}, 'g1');
    expect(result).toEqual({ members: [], error: 'db error' });
  });
});
