import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getMyEventIds } from '@/entities/event/api/getMyEventIds';

vi.mock('@/entities/event/api/getMyEventIds');
beforeEach(() => vi.clearAllMocks());

const req = (guildId: string | null) =>
  ({ nextUrl: { searchParams: { get: () => guildId } } }) as never;

describe('GET /api/my-event-ids', () => {
  it('returns 400 when guildId is missing', async () => {
    expect((await GET(req(null))).status).toBe(400);
  });

  it('returns the event ids', async () => {
    vi.mocked(getMyEventIds).mockResolvedValue(['e1', 'e2']);
    const res = await GET(req('g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ eventIds: ['e1', 'e2'] });
  });

  it('returns 500 on failure', async () => {
    vi.mocked(getMyEventIds).mockRejectedValue(new Error('db'));
    expect((await GET(req('g1'))).status).toBe(500);
  });
});
