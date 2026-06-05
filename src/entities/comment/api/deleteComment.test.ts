import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteComment } from './deleteComment';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('deleteComment', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(deleteComment('c1')).rejects.toThrow('Not authenticated');
  });

  it('throws on delete error', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ error: new Error('nope') })));
    await expect(deleteComment('c1')).rejects.toThrow('nope');
  });

  it('resolves on success', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ error: null })));
    await expect(deleteComment('c1')).resolves.toBeUndefined();
  });
});
