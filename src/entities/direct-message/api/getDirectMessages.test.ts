import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDirectMessages } from './getDirectMessages';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (from: ReturnType<typeof vi.fn>, userId = 'u1') =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user: { id: userId }, from }) as never);

const row = (id: string, created: string) => ({
  id,
  sender_id: 'u2',
  recipient_id: 'u1',
  body: 'hi',
  attachment_url: null,
  created_at: created,
  updated_at: created,
  sender: { public_id: 'pub2', full_name: 'Bob', avatar_url: 'a.png', alias: null, display_as_alias: false, icon: null },
});

const mapped = (id: string, created: string) => ({
  id,
  senderId: 'u2',
  recipientId: 'u1',
  body: 'hi',
  attachmentUrl: null,
  createdAt: created,
  updatedAt: created,
  senderProfile: { publicId: 'pub2', fullName: 'Bob', avatarUrl: 'a.png', alias: null, displayAsAlias: false, icon: null },
});

describe('getDirectMessages', () => {
  it('returns the newest page (reversed to ascending) with hasMore false', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: [
      row('m2', '2026-06-05T11:00:00Z'),
      row('m1', '2026-06-05T10:00:00Z'),
    ] }));
    useClient(from);

    const result = await getDirectMessages('u2', { limit: 50 });
    expect(result.hasMore).toBe(false);
    expect(result.messages).toEqual([
      mapped('m1', '2026-06-05T10:00:00Z'),
      mapped('m2', '2026-06-05T11:00:00Z'),
    ]);
  });

  it('flags hasMore and trims the limit+1 probe row', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: [
      row('m3', '2026-06-05T12:00:00Z'),
      row('m2', '2026-06-05T11:00:00Z'),
      row('m1', '2026-06-05T10:00:00Z'),
    ] }));
    useClient(from);

    const result = await getDirectMessages('u2', { limit: 2 });
    expect(result.hasMore).toBe(true);
    expect(result.messages.map((m) => m.id)).toEqual(['m2', 'm3']);
  });

  it('returns the delta newer than the cursor without hasMore', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: [row('m9', '2026-06-05T13:00:00Z')] }));
    useClient(from);

    const result = await getDirectMessages('u2', { after: '2026-06-05T12:00:00Z' });
    expect(result).toEqual({ messages: [mapped('m9', '2026-06-05T13:00:00Z')], hasMore: false });
  });

  it('throws on query error', async () => {
    useClient(vi.fn().mockReturnValueOnce(query({ error: new Error('boom') })));
    await expect(getDirectMessages('u2')).rejects.toThrow('boom');
  });
});
