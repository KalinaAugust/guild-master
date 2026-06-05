import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH, DELETE } from './route';
import { updateComment } from '@/entities/comment/api/updateComment';
import { deleteComment } from '@/entities/comment/api/deleteComment';
import { InvalidCommentError } from '@/entities/comment/api/createComment';
import { requireUser } from '@/shared/api/guildAuth';
import { NextResponse } from 'next/server';

vi.mock('@/entities/comment/api/updateComment');
vi.mock('@/entities/comment/api/deleteComment');
vi.mock('@/shared/api/guildAuth');
beforeEach(() => vi.clearAllMocks());

const params = (id: string, commentId: string) => ({ params: Promise.resolve({ id, commentId }) });
const body = (b: unknown) => ({ json: () => Promise.resolve(b) }) as never;
const okAuth = () => vi.mocked(requireUser).mockResolvedValue({ ok: true } as never);
const noAuth = () => vi.mocked(requireUser).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) } as never);

describe('PATCH /api/events/[id]/comments/[commentId]', () => {
  it('returns 401 when unauthenticated', async () => {
    noAuth();
    expect((await PATCH(body({ body: 'x' }), params('e1', 'c1'))).status).toBe(401);
  });
  it('updates and returns 200', async () => {
    okAuth();
    vi.mocked(updateComment).mockResolvedValue({ id: 'c1' } as never);
    const res = await PATCH(body({ body: 'x' }), params('e1', 'c1'));
    expect(res.status).toBe(200);
    expect(updateComment).toHaveBeenCalledWith('c1', 'x');
  });
  it('returns 400 on invalid body', async () => {
    okAuth();
    vi.mocked(updateComment).mockRejectedValue(new InvalidCommentError('bad'));
    expect((await PATCH(body({ body: '' }), params('e1', 'c1'))).status).toBe(400);
  });
  it('returns 500 on other failure', async () => {
    okAuth();
    vi.mocked(updateComment).mockRejectedValue(new Error('x'));
    expect((await PATCH(body({ body: 'x' }), params('e1', 'c1'))).status).toBe(500);
  });
});

describe('DELETE /api/events/[id]/comments/[commentId]', () => {
  it('returns 401 when unauthenticated', async () => {
    noAuth();
    expect((await DELETE({} as never, params('e1', 'c1'))).status).toBe(401);
  });
  it('deletes and returns 200', async () => {
    okAuth();
    vi.mocked(deleteComment).mockResolvedValue();
    const res = await DELETE({} as never, params('e1', 'c1'));
    expect(res.status).toBe(200);
    expect(deleteComment).toHaveBeenCalledWith('c1');
  });
  it('returns 500 on failure', async () => {
    okAuth();
    vi.mocked(deleteComment).mockRejectedValue(new Error('x'));
    expect((await DELETE({} as never, params('e1', 'c1'))).status).toBe(500);
  });
});
