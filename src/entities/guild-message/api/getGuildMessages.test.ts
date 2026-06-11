import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGuildMessages } from './getGuildMessages';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ from }) as never);

describe('getGuildMessages', () => {
  it('maps rows to GuildMessage shape', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: [
      { id: 'm1', guild_id: 'g1', user_id: 'u2', body: 'hi', created_at: '2026-06-05T10:00:00Z', updated_at: '2026-06-05T10:00:00Z', profiles: { public_id: 'pub2', full_name: 'Bob', avatar_url: 'a.png', alias: null, display_as_alias: false, icon: null } },
    ] }));
    useClient(from);

    const result = await getGuildMessages('g1');
    expect(result).toEqual([
      { id: 'm1', guildId: 'g1', userId: 'u2', body: 'hi', createdAt: '2026-06-05T10:00:00Z', updatedAt: '2026-06-05T10:00:00Z', profile: { publicId: 'pub2', fullName: 'Bob', avatarUrl: 'a.png', alias: null, displayAsAlias: false, icon: null } },
    ]);
  });

  it('throws on query error', async () => {
    useClient(vi.fn().mockReturnValueOnce(query({ error: new Error('boom') })));
    await expect(getGuildMessages('g1')).rejects.toThrow('boom');
  });
});
