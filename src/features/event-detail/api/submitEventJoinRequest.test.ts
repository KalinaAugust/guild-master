import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitEventJoinRequest, JoinRequestConflictError } from './submitEventJoinRequest';
import { createClient } from '@/shared/api/supabase/server';
import { createAdminClient } from '@/shared/api/supabase/admin';
import { query, mockClient, mockAdminClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
vi.mock('@/shared/api/supabase/admin');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createAdminClient).mockReturnValue(mockAdminClient() as never);
});

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('submitEventJoinRequest', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(submitEventJoinRequest('e1')).rejects.toThrow('Not authenticated');
  });

  it('throws conflict when already a participant', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ data: { id: 'p1' } })));
    await expect(submitEventJoinRequest('e1')).rejects.toBeInstanceOf(JoinRequestConflictError);
  });

  it('throws conflict when a request is already pending', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: null }))
      .mockReturnValueOnce(query({ data: { id: 'r1' } }));
    useClient({ id: 'u1' }, from);
    await expect(submitEventJoinRequest('e1')).rejects.toBeInstanceOf(JoinRequestConflictError);
  });

  it('creates the request, notifies the creator, returns the id', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: null }))                 // participant check
      .mockReturnValueOnce(query({ data: null }))                 // pending check
      .mockReturnValueOnce(query({ data: { id: 'r1' } }))         // insert request
      .mockReturnValueOnce(query({ data: { created_by: 'u2' } }));// event creator
    useClient({ id: 'u1' }, from);
    await expect(submitEventJoinRequest('e1')).resolves.toEqual({ id: 'r1' });
    expect(createAdminClient).toHaveBeenCalled();
  });
});
