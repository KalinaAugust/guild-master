import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markCommentsRead } from './markCommentsRead';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('markCommentsRead', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(markCommentsRead('e1')).rejects.toThrow('Not authenticated');
  });

  it('upserts the read marker and clears notifications', async () => {
    const reads = query({ error: null });
    const notifications = query({ error: null });
    const from = vi.fn()
      .mockReturnValueOnce(reads)          // event_comment_reads upsert
      .mockReturnValueOnce(notifications); // notifications update
    useClient({ id: 'u1' }, from);

    await expect(markCommentsRead('e1')).resolves.toBeUndefined();
    expect(reads.upsert).toHaveBeenCalled();
    expect(notifications.update).toHaveBeenCalledWith({ is_read: true });
  });

  it('throws when the upsert fails', async () => {
    useClient({ id: 'u1' }, vi.fn().mockReturnValueOnce(query({ error: new Error('boom') })));
    await expect(markCommentsRead('e1')).rejects.toThrow('boom');
  });
});
