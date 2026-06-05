import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addSelfAsParticipant } from './addSelfAsParticipant';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('addSelfAsParticipant', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(addSelfAsParticipant('e1')).rejects.toThrow('Not authenticated');
  });

  it('resolves on successful insert', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValue(query({ error: null })));
    await expect(addSelfAsParticipant('e1')).resolves.toBeUndefined();
  });

  it('treats a duplicate-key error as success', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValue(query({ error: { message: 'duplicate key value' } })));
    await expect(addSelfAsParticipant('e1')).resolves.toBeUndefined();
  });

  it('throws on a non-duplicate error', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValue(query({ error: { message: 'boom' } })));
    await expect(addSelfAsParticipant('e1')).rejects.toBeTruthy();
  });
});
