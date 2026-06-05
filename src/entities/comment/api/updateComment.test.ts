import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateComment } from './updateComment';
import { InvalidCommentError } from './createComment';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('updateComment', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(updateComment('c1', 'hi')).rejects.toThrow('Not authenticated');
  });

  it('rejects empty body', async () => {
    useClient({ id: 'u1' }, vi.fn());
    await expect(updateComment('c1', '  ')).rejects.toBeInstanceOf(InvalidCommentError);
  });

  it('updates and returns mapped comment', async () => {
    const from = vi.fn().mockReturnValueOnce(query({ data: {
      id: 'c1', event_id: 'e1', user_id: 'u1', body: 'edited', created_at: 't1', updated_at: 't2', profiles: { full_name: 'Me', avatar_url: null },
    } }));
    useClient({ id: 'u1' }, from);

    const result = await updateComment('c1', '  edited  ');
    expect(result.body).toBe('edited');
    expect(result.updatedAt).toBe('t2');
  });
});
