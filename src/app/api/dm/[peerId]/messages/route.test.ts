import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { getDirectMessages } from '@/entities/direct-message/api/getDirectMessages';
import { createDirectMessage, InvalidDirectMessageError } from '@/entities/direct-message/api/createDirectMessage';
import { resolvePeerId, PeerNotFoundError } from '@/entities/direct-message/api/resolvePeer';
import { requireUser } from '@/shared/api/guildAuth';

vi.mock('@/entities/direct-message/api/getDirectMessages');
vi.mock('@/entities/direct-message/api/createDirectMessage');
vi.mock('@/entities/direct-message/api/resolvePeer');
vi.mock('@/shared/api/guildAuth');
beforeEach(() => vi.clearAllMocks());

const params = (peerId: string) => ({ params: Promise.resolve({ peerId }) });
const okAuth = () => vi.mocked(requireUser).mockResolvedValue({ ok: true } as never);
const getReq = (qs = '') =>
  ({ nextUrl: new URL(`http://x/api/dm/peer1/messages${qs}`) }) as unknown as NextRequest;

describe('GET /api/dm/[peerId]/messages', () => {
  it('returns a page and forwards cursor params', async () => {
    okAuth();
    vi.mocked(resolvePeerId).mockResolvedValue('uuid-peer' as never);
    const page = { messages: [{ id: 'm1' }], hasMore: false };
    vi.mocked(getDirectMessages).mockResolvedValue(page as never);
    const res = await GET(getReq('?limit=30&before=2026-06-05T10:00:00Z'), params('peer1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(page);
    expect(getDirectMessages).toHaveBeenCalledWith('uuid-peer', {
      limit: 30,
      before: '2026-06-05T10:00:00Z',
      after: undefined,
    });
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) } as never);
    const res = await GET(getReq(), params('peer1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when peer not found', async () => {
    okAuth();
    vi.mocked(resolvePeerId).mockRejectedValue(new PeerNotFoundError('not found'));
    const res = await GET(getReq(), params('peer1'));
    expect(res.status).toBe(404);
  });

  it('returns 500 on unexpected failure', async () => {
    okAuth();
    vi.mocked(resolvePeerId).mockResolvedValue('uuid-peer' as never);
    vi.mocked(getDirectMessages).mockRejectedValue(new Error('boom'));
    const res = await GET(getReq(), params('peer1'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/dm/[peerId]/messages', () => {
  it('401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) } as never);
    const req = { json: async () => ({ body: 'hi' }) } as unknown as NextRequest;
    const res = await POST(req, params('peer1'));
    expect(res.status).toBe(401);
  });

  it('creates a message', async () => {
    okAuth();
    vi.mocked(resolvePeerId).mockResolvedValue('uuid-peer' as never);
    vi.mocked(createDirectMessage).mockResolvedValue({ id: 'm1' } as never);
    const req = { json: async () => ({ body: 'hi' }) } as unknown as NextRequest;
    const res = await POST(req, params('peer1'));
    expect(res.status).toBe(201);
    expect(createDirectMessage).toHaveBeenCalledWith('uuid-peer', 'hi', null);
  });

  it('400 on invalid body type', async () => {
    okAuth();
    vi.mocked(resolvePeerId).mockResolvedValue('uuid-peer' as never);
    const req = { json: async () => ({ body: 123 }) } as unknown as NextRequest;
    const res = await POST(req, params('peer1'));
    expect(res.status).toBe(400);
  });

  it('400 on InvalidDirectMessageError', async () => {
    okAuth();
    vi.mocked(resolvePeerId).mockResolvedValue('uuid-peer' as never);
    vi.mocked(createDirectMessage).mockRejectedValue(new InvalidDirectMessageError('too long'));
    const req = { json: async () => ({ body: 'x' }) } as unknown as NextRequest;
    const res = await POST(req, params('peer1'));
    expect(res.status).toBe(400);
  });

  it('404 when peer not found', async () => {
    okAuth();
    vi.mocked(resolvePeerId).mockRejectedValue(new PeerNotFoundError('not found'));
    const req = { json: async () => ({ body: 'hi' }) } as unknown as NextRequest;
    const res = await POST(req, params('peer1'));
    expect(res.status).toBe(404);
  });
});
