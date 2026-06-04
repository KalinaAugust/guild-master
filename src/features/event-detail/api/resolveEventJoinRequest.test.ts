import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveEventJoinRequest, ResolveForbiddenError, ResolveNotFoundError,
} from './resolveEventJoinRequest';
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

describe('resolveEventJoinRequest', () => {
  it('throws forbidden when caller is not the event creator', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ data: { created_by: 'someone-else' } })));
    await expect(resolveEventJoinRequest('e1', 'r1', 'approve')).rejects.toBeInstanceOf(ResolveForbiddenError);
  });

  it('throws not-found when the pending request is missing', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { created_by: 'u1' } }))
      .mockReturnValueOnce(query({ data: null }));
    useClient({ id: 'u1' }, from);
    await expect(resolveEventJoinRequest('e1', 'r1', 'approve')).rejects.toBeInstanceOf(ResolveNotFoundError);
  });

  it('approve: inserts participant, updates request, notifies', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { created_by: 'u1' } })) // event
      .mockReturnValueOnce(query({ data: { user_id: 'u2' } }))    // request
      .mockReturnValueOnce(query({ error: null }))               // insert participant
      .mockReturnValueOnce(query({ error: null }));              // update request
    useClient({ id: 'u1' }, from);
    await expect(resolveEventJoinRequest('e1', 'r1', 'approve')).resolves.toBeUndefined();
    expect(createAdminClient).toHaveBeenCalled();
  });

  it('decline: updates request without inserting a participant', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { created_by: 'u1' } }))
      .mockReturnValueOnce(query({ data: { user_id: 'u2' } }))
      .mockReturnValueOnce(query({ error: null })); // update request only
    useClient({ id: 'u1' }, from);
    await expect(resolveEventJoinRequest('e1', 'r1', 'decline')).resolves.toBeUndefined();
  });
});
