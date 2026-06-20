import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConversations } from './getConversations';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (from: ReturnType<typeof vi.fn>, userId = 'u1') =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: userId }, from }) as never);

/** Helper: build a from() mock for getConversations' three queries in order:
 *  1. direct_messages  2. profiles  3. direct_message_reads (parallel via Promise.all) */
const makeFrom = (
  messages: unknown[],
  profiles: unknown[],
  reads: unknown[],
) => vi.fn()
  .mockReturnValueOnce(query({ data: messages }))
  .mockReturnValueOnce(query({ data: profiles }))
  .mockReturnValueOnce(query({ data: reads }));

describe('getConversations', () => {
  it('returns empty array when there are no messages', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: [] }));
    useClient(from);

    const result = await getConversations();
    expect(result).toEqual([]);
  });

  it('reduces to newest message per peer', async () => {
    // u1 sent two messages to u2, then u2 replied — newest per peer = the reply from u2
    const from = makeFrom(
      [
        // newest first (already ordered)
        { id: 'm3', sender_id: 'u2', recipient_id: 'u1', body: 'reply', attachment_url: null, created_at: '2026-06-01T12:00:00Z' },
        { id: 'm2', sender_id: 'u1', recipient_id: 'u2', body: 'hi again', attachment_url: null, created_at: '2026-06-01T11:00:00Z' },
        { id: 'm1', sender_id: 'u1', recipient_id: 'u2', body: 'hi', attachment_url: null, created_at: '2026-06-01T10:00:00Z' },
      ],
      [{ id: 'u2', public_id: 'pub2', full_name: 'User Two', avatar_url: null, alias: null, display_as_alias: false, icon: null, last_seen_at: null }],
      [],
    );
    useClient(from);

    const result = await getConversations();
    expect(result).toHaveLength(1);
    expect(result[0].lastMessage.body).toBe('reply');
    // The newest message was sent by u2, so senderIsMe = false
    expect(result[0].lastMessage.senderIsMe).toBe(false);
  });

  it('sets senderIsMe=true when the newest message is from the current user', async () => {
    const from = makeFrom(
      [
        { id: 'm1', sender_id: 'u1', recipient_id: 'u2', body: 'hey', attachment_url: null, created_at: '2026-06-01T10:00:00Z' },
      ],
      [{ id: 'u2', public_id: 'pub2', full_name: 'User Two', avatar_url: null, alias: null, display_as_alias: false, icon: null, last_seen_at: null }],
      [],
    );
    useClient(from);

    const result = await getConversations();
    expect(result[0].lastMessage.senderIsMe).toBe(true);
  });

  it('hasUnread=false when senderIsMe (outbound last message)', async () => {
    const from = makeFrom(
      [{ id: 'm1', sender_id: 'u1', recipient_id: 'u2', body: 'hey', attachment_url: null, created_at: '2026-06-01T10:00:00Z' }],
      [{ id: 'u2', public_id: 'pub2', full_name: 'User Two', avatar_url: null, alias: null, display_as_alias: false, icon: null, last_seen_at: null }],
      [],
    );
    useClient(from);

    const result = await getConversations();
    expect(result[0].hasUnread).toBe(false);
  });

  it('hasUnread=true when inbound message is newer than read cursor', async () => {
    const from = makeFrom(
      [{ id: 'm1', sender_id: 'u2', recipient_id: 'u1', body: 'hi', attachment_url: null, created_at: '2026-06-01T12:00:00Z' }],
      [{ id: 'u2', public_id: 'pub2', full_name: 'User Two', avatar_url: null, alias: null, display_as_alias: false, icon: null, last_seen_at: null }],
      [{ peer_id: 'u2', last_read_at: '2026-06-01T10:00:00Z' }],
    );
    useClient(from);

    const result = await getConversations();
    expect(result[0].hasUnread).toBe(true);
  });

  it('hasUnread=false when inbound message is older than or equal to read cursor', async () => {
    const from = makeFrom(
      [{ id: 'm1', sender_id: 'u2', recipient_id: 'u1', body: 'hi', attachment_url: null, created_at: '2026-06-01T10:00:00Z' }],
      [{ id: 'u2', public_id: 'pub2', full_name: 'User Two', avatar_url: null, alias: null, display_as_alias: false, icon: null, last_seen_at: null }],
      [{ peer_id: 'u2', last_read_at: '2026-06-01T12:00:00Z' }],
    );
    useClient(from);

    const result = await getConversations();
    expect(result[0].hasUnread).toBe(false);
  });

  it('hasUnread=true when there is no read cursor for an inbound message', async () => {
    const from = makeFrom(
      [{ id: 'm1', sender_id: 'u2', recipient_id: 'u1', body: 'hi', attachment_url: null, created_at: '2026-06-01T10:00:00Z' }],
      [{ id: 'u2', public_id: 'pub2', full_name: 'User Two', avatar_url: null, alias: null, display_as_alias: false, icon: null, last_seen_at: null }],
      [],
    );
    useClient(from);

    const result = await getConversations();
    expect(result[0].hasUnread).toBe(true);
  });

  it('maps peer presence (lastSeenAt) from profile', async () => {
    const from = makeFrom(
      [{ id: 'm1', sender_id: 'u2', recipient_id: 'u1', body: 'hi', attachment_url: null, created_at: '2026-06-01T10:00:00Z' }],
      [{ id: 'u2', public_id: 'pub2', full_name: 'User Two', avatar_url: null, alias: null, display_as_alias: false, icon: null, last_seen_at: '2026-06-01T09:00:00Z' }],
      [],
    );
    useClient(from);

    const result = await getConversations();
    expect(result[0].peer.lastSeenAt).toBe('2026-06-01T09:00:00Z');
  });

  it('handles missing profile gracefully (nulls/defaults)', async () => {
    const from = makeFrom(
      [{ id: 'm1', sender_id: 'u2', recipient_id: 'u1', body: 'hi', attachment_url: null, created_at: '2026-06-01T10:00:00Z' }],
      [], // no profile returned
      [],
    );
    useClient(from);

    const result = await getConversations();
    expect(result[0].peer.fullName).toBeNull();
    expect(result[0].peer.displayAsAlias).toBe(false);
    expect(result[0].peer.lastSeenAt).toBeNull();
  });

  it('handles multiple peers and returns one entry per peer', async () => {
    const from = makeFrom(
      [
        { id: 'm2', sender_id: 'u3', recipient_id: 'u1', body: 'from u3', attachment_url: null, created_at: '2026-06-01T11:00:00Z' },
        { id: 'm1', sender_id: 'u2', recipient_id: 'u1', body: 'from u2', attachment_url: null, created_at: '2026-06-01T10:00:00Z' },
      ],
      [
        { id: 'u2', public_id: 'pub2', full_name: 'User Two', avatar_url: null, alias: null, display_as_alias: false, icon: null, last_seen_at: null },
        { id: 'u3', public_id: 'pub3', full_name: 'User Three', avatar_url: null, alias: null, display_as_alias: false, icon: null, last_seen_at: null },
      ],
      [],
    );
    useClient(from);

    const result = await getConversations();
    expect(result).toHaveLength(2);
  });

  it('throws when messages query errors', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ error: new Error('messages error') }));
    useClient(from);

    await expect(getConversations()).rejects.toThrow('messages error');
  });

  it('throws when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(mockClient({ user: null }) as never);

    await expect(getConversations()).rejects.toThrow('Not authenticated');
  });
});
