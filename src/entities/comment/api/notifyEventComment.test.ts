import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyEventComment } from './notifyEventComment';
import { createAdminClient } from '@/shared/api/supabase/admin';
import { query } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/admin');
beforeEach(() => vi.clearAllMocks());

const useAdmin = (from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);

describe('notifyEventComment', () => {
  it('notifies creator + confirmed participants except the author, after dedup', async () => {
    const insert = query({ error: null });
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { created_by: 'creator' } }))                       // events
      .mockReturnValueOnce(query({ data: [{ user_id: 'creator' }, { user_id: 'u2' }, { user_id: 'author' }] })) // confirmed
      .mockReturnValueOnce(query({ data: [{ user_id: 'u2' }] }))                              // existing unread -> dedup u2
      .mockReturnValueOnce(insert);                                                           // notifications insert
    useAdmin(from);

    await notifyEventComment('e1', 'author');

    expect(insert.insert).toHaveBeenCalledWith([
      { user_id: 'creator', type: 'event_comment', entity_type: 'event', entity_id: 'e1' },
    ]);
  });

  it('does nothing when the only recipient is the author', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { created_by: 'author' } }))
      .mockReturnValueOnce(query({ data: [{ user_id: 'author' }] }));
    useAdmin(from);

    await notifyEventComment('e1', 'author');
    expect(from).toHaveBeenCalledTimes(2); // never reaches the notifications insert
  });

  it('does nothing when everyone is already notified', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: { created_by: 'creator' } }))
      .mockReturnValueOnce(query({ data: [{ user_id: 'u2' }] }))
      .mockReturnValueOnce(query({ data: [{ user_id: 'creator' }, { user_id: 'u2' }] }));
    useAdmin(from);

    await notifyEventComment('e1', 'author');
    expect(from).toHaveBeenCalledTimes(3); // dedup empties the set, no insert
  });
});
