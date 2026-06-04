import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { syncParticipants } from '@/entities/event/api/syncParticipants';

vi.mock('@/entities/event/api/syncParticipants');
beforeEach(() => vi.clearAllMocks());

const params = (eventId: string) => ({ params: Promise.resolve({ eventId }) });
const req = (body: unknown) => ({ json: () => Promise.resolve(body) }) as never;

describe('POST /api/participants/[eventId]/sync', () => {
  it('syncs and returns 200', async () => {
    vi.mocked(syncParticipants).mockResolvedValue();
    const res = await POST(req({ userIds: ['a', 'b'] }), params('e1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ synced: true });
    expect(syncParticipants).toHaveBeenCalledWith('e1', ['a', 'b']);
  });

  it('returns 500 on failure', async () => {
    vi.mocked(syncParticipants).mockRejectedValue(new Error('db'));
    expect((await POST(req({ userIds: [] }), params('e1'))).status).toBe(500);
  });
});
