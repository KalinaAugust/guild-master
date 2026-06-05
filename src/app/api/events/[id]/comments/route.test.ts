import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { getComments } from '@/entities/comment/api/getComments';
import { createComment, InvalidCommentError } from '@/entities/comment/api/createComment';
import { requireUser } from '@/shared/api/guildAuth';
import { NextResponse } from 'next/server';

vi.mock('@/entities/comment/api/getComments');
vi.mock('@/entities/comment/api/createComment');
vi.mock('@/shared/api/guildAuth');
beforeEach(() => vi.clearAllMocks());

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const body = (b: unknown) => ({ json: () => Promise.resolve(b) }) as never;
const okAuth = () => vi.mocked(requireUser).mockResolvedValue({ ok: true } as never);

describe('GET /api/events/[id]/comments', () => {
  it('returns comments', async () => {
    vi.mocked(getComments).mockResolvedValue([] as never);
    const res = await GET({} as never, params('e1'));
    expect(res.status).toBe(200);
  });
  it('returns 500 on failure', async () => {
    vi.mocked(getComments).mockRejectedValue(new Error('x'));
    expect((await GET({} as never, params('e1'))).status).toBe(500);
  });
});

describe('POST /api/events/[id]/comments', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) } as never);
    expect((await POST(body({ body: 'hi' }), params('e1'))).status).toBe(401);
  });
  it('creates comment and returns 201', async () => {
    okAuth();
    vi.mocked(createComment).mockResolvedValue({ id: 'c1' } as never);
    const res = await POST(body({ body: 'hi' }), params('e1'));
    expect(res.status).toBe(201);
    expect(createComment).toHaveBeenCalledWith('e1', 'hi');
  });
  it('returns 400 on invalid body', async () => {
    okAuth();
    vi.mocked(createComment).mockRejectedValue(new InvalidCommentError('bad'));
    expect((await POST(body({ body: '' }), params('e1'))).status).toBe(400);
  });
  it('returns 500 on other failure', async () => {
    okAuth();
    vi.mocked(createComment).mockRejectedValue(new Error('x'));
    expect((await POST(body({ body: 'hi' }), params('e1'))).status).toBe(500);
  });
});
