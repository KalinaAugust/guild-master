import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventJoinRequests } from './getEventJoinRequests';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

describe('getEventJoinRequests', () => {
  it('maps pending requests with profile data', async () => {
    const from = vi.fn().mockReturnValue(query({ data: [
      { id: 'r1', user_id: 'u2', created_at: 't1', profiles: { public_id: 'pub2', full_name: 'Bob', avatar_url: 'a.png', alias: null, display_as_alias: false, icon: null } },
      { id: 'r2', user_id: 'u3', created_at: 't2', profiles: { public_id: 'pub3', full_name: 'Carol', avatar_url: null, alias: 'Caz', display_as_alias: true, icon: 'Shield' } },
      { id: 'r3', user_id: 'u4', created_at: 't3', profiles: null },
    ] }));
    vi.mocked(createClient).mockResolvedValue(mockClient({ from }) as never);

    await expect(getEventJoinRequests('e1')).resolves.toEqual([
      { id: 'r1', userId: 'u2', publicId: 'pub2', userName: 'Bob', avatarUrl: 'a.png', icon: null, createdAt: 't1' },
      { id: 'r2', userId: 'u3', publicId: 'pub3', userName: 'Caz', avatarUrl: null, icon: 'Shield', createdAt: 't2' },
      { id: 'r3', userId: 'u4', publicId: null, userName: null, avatarUrl: null, icon: null, createdAt: 't3' },
    ]);
  });

  it('returns an empty array when there are no requests', async () => {
    const from = vi.fn().mockReturnValue(query({ data: [] }));
    vi.mocked(createClient).mockResolvedValue(mockClient({ from }) as never);
    await expect(getEventJoinRequests('e1')).resolves.toEqual([]);
  });
});
