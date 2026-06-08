import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGuildChatUnread } from './getGuildChatUnread';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

// First `from` call = read state, second = messages list.
const useClient = (user: { id: string }, read: unknown, messages: unknown[]) => {
  const from = vi.fn()
    .mockReturnValueOnce(query({ data: read }))
    .mockReturnValueOnce(query({ data: messages }));
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);
  return from;
};

describe('getGuildChatUnread', () => {
  it('reports unread when another user posted after last read', async () => {
    useClient(
      { id: 'u1' },
      { last_read_at: '2026-06-05T10:00:00Z' },
      [{ user_id: 'u2', created_at: '2026-06-05T11:00:00Z' }],
    );
    expect(await getGuildChatUnread('g1')).toEqual({ hasUnread: true });
  });

  it('ignores the viewer\'s own newer messages', async () => {
    useClient(
      { id: 'u1' },
      { last_read_at: '2026-06-05T10:00:00Z' },
      [{ user_id: 'u1', created_at: '2026-06-05T11:00:00Z' }],
    );
    expect(await getGuildChatUnread('g1')).toEqual({ hasUnread: false });
  });

  it('treats all others\' messages as unread when never read', async () => {
    useClient(
      { id: 'u1' },
      null,
      [{ user_id: 'u2', created_at: '2026-06-05T09:00:00Z' }],
    );
    expect(await getGuildChatUnread('g1')).toEqual({ hasUnread: true });
  });
});
