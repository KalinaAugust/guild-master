import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCommentReadState } from './getCommentReadState';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('getCommentReadState', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(getCommentReadState('e1')).rejects.toThrow('Not authenticated');
  });

  it('returns the stored last_read_at', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ data: { last_read_at: 't1' } })));
    expect(await getCommentReadState('e1')).toEqual({ lastReadAt: 't1' });
  });

  it('returns null when no read row exists', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ data: null })));
    expect(await getCommentReadState('e1')).toEqual({ lastReadAt: null });
  });
});
