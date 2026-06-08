import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteGuildMessage } from './deleteGuildMessage';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('deleteGuildMessage', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(deleteGuildMessage('m1')).rejects.toThrow('Not authenticated');
  });

  it('throws on query error', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ error: new Error('boom') })));
    await expect(deleteGuildMessage('m1')).rejects.toThrow('boom');
  });

  it('resolves when delete succeeds', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ error: null })));
    await expect(deleteGuildMessage('m1')).resolves.toBeUndefined();
  });
});
