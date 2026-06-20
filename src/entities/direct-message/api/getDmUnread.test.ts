import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDmUnread } from './getDmUnread';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (from: ReturnType<typeof vi.fn>, userId = 'u1') =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: userId }, from }) as never);

describe('getDmUnread', () => {
  it('returns hasUnread true when newest inbound message is newer than read cursor', async () => {
    const from = vi.fn()
      // first call: direct_message_reads
      .mockReturnValueOnce(query({ data: [{ peer_id: 'u2', last_read_at: '2026-06-01T10:00:00Z' }] }))
      // second call: direct_messages
      .mockReturnValueOnce(query({ data: [{ sender_id: 'u2', created_at: '2026-06-01T11:00:00Z' }] }));
    useClient(from);

    const result = await getDmUnread();
    expect(result).toEqual({ hasUnread: true });
  });

  it('returns hasUnread false when newest inbound message is older than or equal to read cursor', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: [{ peer_id: 'u2', last_read_at: '2026-06-01T12:00:00Z' }] }))
      .mockReturnValueOnce(query({ data: [{ sender_id: 'u2', created_at: '2026-06-01T11:00:00Z' }] }));
    useClient(from);

    const result = await getDmUnread();
    expect(result).toEqual({ hasUnread: false });
  });

  it('returns hasUnread true when there is no read cursor for a sender', async () => {
    const from = vi.fn()
      // no read cursors at all
      .mockReturnValueOnce(query({ data: [] }))
      .mockReturnValueOnce(query({ data: [{ sender_id: 'u2', created_at: '2026-06-01T11:00:00Z' }] }));
    useClient(from);

    const result = await getDmUnread();
    expect(result).toEqual({ hasUnread: true });
  });

  it('returns hasUnread false when there are no inbound messages', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: [] }))
      .mockReturnValueOnce(query({ data: [] }));
    useClient(from);

    const result = await getDmUnread();
    expect(result).toEqual({ hasUnread: false });
  });

  it('throws when direct_message_reads query errors', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ error: new Error('reads error') }));
    useClient(from);

    await expect(getDmUnread()).rejects.toThrow('reads error');
  });

  it('throws when direct_messages query errors', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: [] }))
      .mockReturnValueOnce(query({ error: new Error('messages error') }));
    useClient(from);

    await expect(getDmUnread()).rejects.toThrow('messages error');
  });

  it('only checks the newest message per sender (deduplicates)', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: [{ peer_id: 'u2', last_read_at: '2026-06-01T12:00:00Z' }] }))
      // two messages from u2; newest is older than cursor
      .mockReturnValueOnce(query({ data: [
        { sender_id: 'u2', created_at: '2026-06-01T11:00:00Z' },
        { sender_id: 'u2', created_at: '2026-06-01T09:00:00Z' },
      ] }));
    useClient(from);

    const result = await getDmUnread();
    expect(result).toEqual({ hasUnread: false });
  });
});
