import { describe, it, expect, vi, beforeEach } from 'vitest';
import { leaveEvent } from './leaveEvent';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('leaveEvent', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(leaveEvent('e1')).rejects.toThrow('Not authenticated');
  });

  it('resolves on success', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValue(query({ error: null })));
    await expect(leaveEvent('e1')).resolves.toBeUndefined();
  });

  it('throws on db error', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValue(query({ error: { message: 'boom' } })));
    await expect(leaveEvent('e1')).rejects.toBeTruthy();
  });
});
