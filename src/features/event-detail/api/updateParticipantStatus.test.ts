import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateParticipantStatus } from './updateParticipantStatus';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('updateParticipantStatus', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(updateParticipantStatus('e1', 'confirmed')).rejects.toThrow('Not authenticated');
  });

  it('resolves on success', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValue(query({ error: null })));
    await expect(updateParticipantStatus('e1', 'confirmed')).resolves.toBeUndefined();
  });

  it('throws on db error', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValue(query({ error: { message: 'boom' } })));
    await expect(updateParticipantStatus('e1', 'declined')).rejects.toBeTruthy();
  });
});
