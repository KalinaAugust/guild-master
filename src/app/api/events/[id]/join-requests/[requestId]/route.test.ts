import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { PATCH } from './route';
import { requireUser } from '@/shared/api/guildAuth';
import {
  resolveEventJoinRequest, ResolveForbiddenError, ResolveNotFoundError,
} from '@/features/event-detail/api/resolveEventJoinRequest';

vi.mock('@/shared/api/guildAuth');
vi.mock('@/features/event-detail/api/resolveEventJoinRequest');

const params = (id: string, requestId: string) => ({ params: Promise.resolve({ id, requestId }) });
const body = (b: unknown) => ({ json: () => Promise.resolve(b) }) as never;
const ok = () => vi.mocked(requireUser).mockResolvedValue({ ok: true, supabase: {} as never, user: { id: 'u1' } as never });

beforeEach(() => vi.clearAllMocks());

describe('PATCH /api/events/[id]/join-requests/[requestId]', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    expect((await PATCH(body({ action: 'approve' }), params('e1', 'r1'))).status).toBe(401);
  });
  it('returns 400 for an invalid action', async () => {
    ok();
    expect((await PATCH(body({ action: 'nope' }), params('e1', 'r1'))).status).toBe(400);
  });
  it('resolves and returns 200', async () => {
    ok();
    vi.mocked(resolveEventJoinRequest).mockResolvedValue();
    const res = await PATCH(body({ action: 'approve' }), params('e1', 'r1'));
    expect(res.status).toBe(200);
    expect(resolveEventJoinRequest).toHaveBeenCalledWith('e1', 'r1', 'approve');
  });
  it('returns 403 when forbidden', async () => {
    ok();
    vi.mocked(resolveEventJoinRequest).mockRejectedValue(new ResolveForbiddenError('no'));
    expect((await PATCH(body({ action: 'approve' }), params('e1', 'r1'))).status).toBe(403);
  });
  it('returns 404 when not found', async () => {
    ok();
    vi.mocked(resolveEventJoinRequest).mockRejectedValue(new ResolveNotFoundError('no'));
    expect((await PATCH(body({ action: 'decline' }), params('e1', 'r1'))).status).toBe(404);
  });
  it('returns 500 on other errors', async () => {
    ok();
    vi.mocked(resolveEventJoinRequest).mockRejectedValue(new Error('x'));
    expect((await PATCH(body({ action: 'approve' }), params('e1', 'r1'))).status).toBe(500);
  });
});
