import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAnnouncementsUnread } from './getAnnouncementsUnread';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

// First `from` call = read state, second = filtered announcements query.
const useClient = (user: { id: string }, read: unknown, rows: unknown[]) => {
  const from = vi.fn()
    .mockReturnValueOnce(query({ data: read }))
    .mockReturnValueOnce(query({ data: rows }));
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);
  return from;
};

describe('getAnnouncementsUnread', () => {
  it('throws when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: null }) as never);
    await expect(getAnnouncementsUnread('g1')).rejects.toThrow('Not authenticated');
  });

  it('reports unread when a foreign announcement is newer than last read', async () => {
    useClient({ id: 'u1' }, { last_read_at: '2026-06-05T10:00:00Z' }, [{ id: 'a1' }]);
    expect(await getAnnouncementsUnread('g1')).toEqual({ hasUnread: true });
  });

  it('reports no unread when the filtered query returns nothing', async () => {
    useClient({ id: 'u1' }, { last_read_at: '2026-06-05T10:00:00Z' }, []);
    expect(await getAnnouncementsUnread('g1')).toEqual({ hasUnread: false });
  });

  it('works when the user has never opened announcements (no read row)', async () => {
    useClient({ id: 'u1' }, null, [{ id: 'a1' }]);
    expect(await getAnnouncementsUnread('g1')).toEqual({ hasUnread: true });
  });

  it('throws when the read-state query errors', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ error: new Error('boom') }));
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: 'u1' }, from }) as never);
    await expect(getAnnouncementsUnread('g1')).rejects.toThrow('boom');
  });
});
