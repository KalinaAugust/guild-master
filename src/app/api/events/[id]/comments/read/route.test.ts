import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { getCommentReadState } from '@/entities/comment/api/getCommentReadState';
import { markCommentsRead } from '@/entities/comment/api/markCommentsRead';
import { requireUser } from '@/shared/api/guildAuth';
import { NextResponse } from 'next/server';

vi.mock('@/entities/comment/api/getCommentReadState');
vi.mock('@/entities/comment/api/markCommentsRead');
vi.mock('@/shared/api/guildAuth');
beforeEach(() => vi.clearAllMocks());

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/events/[id]/comments/read', () => {
  it('returns read state', async () => {
    vi.mocked(getCommentReadState).mockResolvedValue({ lastReadAt: 't1' });
    const res = await GET({} as never, params('e1'));
    expect(res.status).toBe(200);
  });
  it('returns 500 on failure', async () => {
    vi.mocked(getCommentReadState).mockRejectedValue(new Error('x'));
    expect((await GET({} as never, params('e1'))).status).toBe(500);
  });
});

describe('POST /api/events/[id]/comments/read', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) } as never);
    expect((await POST({} as never, params('e1'))).status).toBe(401);
  });
  it('marks read and returns 200', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: true } as never);
    vi.mocked(markCommentsRead).mockResolvedValue();
    const res = await POST({} as never, params('e1'));
    expect(res.status).toBe(200);
    expect(markCommentsRead).toHaveBeenCalledWith('e1');
  });
  it('returns 500 on failure', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: true } as never);
    vi.mocked(markCommentsRead).mockRejectedValue(new Error('x'));
    expect((await POST({} as never, params('e1'))).status).toBe(500);
  });
});
