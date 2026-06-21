import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from './route';
import { getGuildMessages } from '@/entities/guild-message/api/getGuildMessages';
import { createGuildMessage, InvalidGuildMessageError } from '@/entities/guild-message/api/createGuildMessage';
import { requireUser, requireGuildRole } from '@/shared/api/guildAuth';

vi.mock('@/entities/guild-message/api/getGuildMessages');
vi.mock('@/entities/guild-message/api/createGuildMessage');
vi.mock('@/shared/api/guildAuth', () => ({
  requireUser: vi.fn(),
  requireGuildRole: vi.fn().mockResolvedValue(null),
}));
beforeEach(() => vi.clearAllMocks());

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const okAuth = () => vi.mocked(requireUser).mockResolvedValue({ ok: true, supabase: {}, user: { id: 'u1' } } as never);
const getReq = (qs = '') =>
  ({ nextUrl: new URL(`http://x/api/guilds/g1/messages${qs}`) }) as unknown as NextRequest;

describe('GET /api/guilds/[id]/messages', () => {
  it('returns a page and forwards cursor params', async () => {
    const page = { messages: [{ id: 'm1' }], hasMore: true };
    vi.mocked(getGuildMessages).mockResolvedValue(page as never);
    const res = await GET(getReq('?limit=30&before=2026-06-05T10:00:00Z'), params('g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(page);
    expect(getGuildMessages).toHaveBeenCalledWith('g1', {
      limit: 30,
      before: '2026-06-05T10:00:00Z',
      after: undefined,
      scope: 'all',
    });
  });

  it('returns 500 on failure', async () => {
    vi.mocked(getGuildMessages).mockRejectedValue(new Error('boom'));
    const res = await GET(getReq(), params('g1'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/guilds/[id]/messages', () => {
  it('401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) } as never);
    const req = { json: async () => ({ body: 'hi' }) } as unknown as NextRequest;
    const res = await POST(req, params('g1'));
    expect(res.status).toBe(401);
  });

  it('creates a message', async () => {
    okAuth();
    vi.mocked(requireGuildRole).mockResolvedValue(null);
    vi.mocked(createGuildMessage).mockResolvedValue({ id: 'm1' } as never);
    const req = { json: async () => ({ body: 'hi' }) } as unknown as NextRequest;
    const res = await POST(req, params('g1'));
    expect(res.status).toBe(201);
    expect(createGuildMessage).toHaveBeenCalledWith('g1', 'hi', null, 'all');
  });

  it('400 on invalid body type', async () => {
    okAuth();
    const req = { json: async () => ({ body: 123 }) } as unknown as NextRequest;
    const res = await POST(req, params('g1'));
    expect(res.status).toBe(400);
  });

  it('400 on InvalidGuildMessageError', async () => {
    okAuth();
    vi.mocked(createGuildMessage).mockRejectedValue(new InvalidGuildMessageError('too long'));
    const req = { json: async () => ({ body: 'x' }) } as unknown as NextRequest;
    const res = await POST(req, params('g1'));
    expect(res.status).toBe(400);
  });

  it('rejects officer-scope POST from a non-officer with 403', async () => {
    okAuth();
    vi.mocked(requireGuildRole).mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    );
    const res = await POST(
      new NextRequest('http://t/api/guilds/g1/messages', {
        method: 'POST',
        body: JSON.stringify({ body: 'secret', scope: 'officers' }),
      }),
      { params: Promise.resolve({ id: 'g1' }) },
    );
    expect(res.status).toBe(403);
    expect(createGuildMessage).not.toHaveBeenCalled();
  });
});
