import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncParticipants } from './syncParticipants';
import { createClient } from '@/shared/api/supabase/server';

vi.mock('@/shared/api/supabase/server', () => ({
  createClient: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

function makeDb(currentRows: { user_id: string }[]) {
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  const deleteFn = vi.fn();
  const inFn = vi.fn().mockResolvedValue({ error: null });
  const deleteEqFn = vi.fn().mockReturnValue({ in: inFn });
  deleteFn.mockReturnValue({ eq: deleteEqFn });

  const selectFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: currentRows, error: null }),
  });

  return {
    from: vi.fn((table: string) => {
      if (table === 'event_participants') {
        return { select: selectFn, insert: insertFn, delete: deleteFn };
      }
      return {};
    }),
    _insert: insertFn,
    _deleteEq: deleteEqFn,
    _in: inFn,
  };
}

describe('syncParticipants', () => {
  it('inserts new participants', async () => {
    const mock = makeDb([]);
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await syncParticipants('e1', ['u1', 'u2']);

    expect(mock._insert).toHaveBeenCalledWith([
      { event_id: 'e1', user_id: 'u1', status: 'pending' },
      { event_id: 'e1', user_id: 'u2', status: 'pending' },
    ]);
  });

  it('deletes removed participants', async () => {
    const mock = makeDb([{ user_id: 'u1' }, { user_id: 'u2' }]);
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await syncParticipants('e1', ['u1']);

    expect(mock._in).toHaveBeenCalledWith('user_id', ['u2']);
  });

  it('does nothing when lists match', async () => {
    const mock = makeDb([{ user_id: 'u1' }]);
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await syncParticipants('e1', ['u1']);

    expect(mock._insert).not.toHaveBeenCalled();
    expect(mock._deleteEq).not.toHaveBeenCalled();
  });
});
