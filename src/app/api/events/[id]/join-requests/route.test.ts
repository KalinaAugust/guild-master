import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { GET, POST } from './route';
import { requireUser } from '@/shared/api/guildAuth';
import { getEventJoinRequests } from '@/features/event-detail/api/getEventJoinRequests';
import {
  submitEventJoinRequest, JoinRequestConflictError,
} from '@/features/event-detail/api/submitEventJoinRequest';

vi.mock('@/shared/api/guildAuth');
vi.mock('@/features/event-detail/api/getEventJoinRequests');
vi.mock('@/features/event-detail/api/submitEventJoinRequest');

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = {} as never;
const ok = () => vi.mocked(requireUser).mockResolvedValue({ ok: true, supabase: {} as never, user: { id: 'u1' } as never });
const unauth = () => vi.mocked(requireUser).mockResolvedValue({
  ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
});

beforeEach(() => vi.clearAllMocks());

describe('GET /api/events/[id]/join-requests', () => {
  it('returns 401 when unauthenticated', async () => {
    unauth();
    expect((await GET(req, params('e1'))).status).toBe(401);
  });
  it('returns the requests', async () => {
    ok();
    vi.mocked(getEventJoinRequests).mockResolvedValue([{ id: 'r1' }] as never);
    const res = await GET(req, params('e1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'r1' }]);
  });
  it('returns 500 on failure', async () => {
    ok();
    vi.mocked(getEventJoinRequests).mockRejectedValue(new Error('x'));
    expect((await GET(req, params('e1'))).status).toBe(500);
  });
});

describe('POST /api/events/[id]/join-requests', () => {
  it('returns 401 when unauthenticated', async () => {
    unauth();
    expect((await POST(req, params('e1'))).status).toBe(401);
  });
  it('creates and returns 201', async () => {
    ok();
    vi.mocked(submitEventJoinRequest).mockResolvedValue({ id: 'r1' });
    const res = await POST(req, params('e1'));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'r1' });
  });
  it('returns 409 on conflict', async () => {
    ok();
    vi.mocked(submitEventJoinRequest).mockRejectedValue(new JoinRequestConflictError('Already a participant'));
    expect((await POST(req, params('e1'))).status).toBe(409);
  });
  it('returns 500 on other errors', async () => {
    ok();
    vi.mocked(submitEventJoinRequest).mockRejectedValue(new Error('x'));
    expect((await POST(req, params('e1'))).status).toBe(500);
  });
});
