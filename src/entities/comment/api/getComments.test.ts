import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getComments } from './getComments';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ from }) as never);

describe('getComments', () => {
  it('maps rows to EventComment shape', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: [
      { id: 'c1', event_id: 'e1', user_id: 'u2', body: 'hi', created_at: '2026-06-05T10:00:00Z', updated_at: '2026-06-05T10:00:00Z', profiles: { public_id: 'pub2', full_name: 'Bob', avatar_url: 'a.png' } },
    ] }));
    useClient(from);

    const result = await getComments('e1');
    expect(result).toEqual([
      { id: 'c1', eventId: 'e1', userId: 'u2', body: 'hi', createdAt: '2026-06-05T10:00:00Z', updatedAt: '2026-06-05T10:00:00Z', profile: { publicId: 'pub2', fullName: 'Bob', avatarUrl: 'a.png' } },
    ]);
  });

  it('throws on query error', async () => {
    useClient(vi.fn().mockReturnValueOnce(query({ error: new Error('boom') })));
    await expect(getComments('e1')).rejects.toThrow('boom');
  });
});
