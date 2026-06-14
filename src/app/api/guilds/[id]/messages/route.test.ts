import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { getGuildMessages } from '@/entities/guild-message/api/getGuildMessages';
import { createGuildMessage, InvalidGuildMessageError } from '@/entities/guild-message/api/createGuildMessage';
import { requireUser } from '@/shared/api/guildAuth';

vi.mock('@/entities/guild-message/api/getGuildMessages');
vi.mock('@/entities/guild-message/api/createGuildMessage');
vi.mock('@/shared/api/guildAuth');
beforeEach(() => vi.clearAllMocks());

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const okAuth = () => vi.mocked(requireUser).mockResolvedValue({ ok: true } as never);

describe('GET /api/guilds/[id]/messages', () => {
  it('returns messages', async () => {
    vi.mocked(getGuildMessages).mockResolvedValue([{ id: 'm1' }] as never);
    const res = await GET({} as NextRequest, params('g1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 'm1' }]);
  });

  it('returns 500 on failure', async () => {
    vi.mocked(getGuildMessages).mockRejectedValue(new Error('boom'));
    const res = await GET({} as NextRequest, params('g1'));
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
    vi.mocked(createGuildMessage).mockResolvedValue({ id: 'm1' } as never);
    const req = { json: async () => ({ body: 'hi' }) } as unknown as NextRequest;
    const res = await POST(req, params('g1'));
    expect(res.status).toBe(201);
    expect(createGuildMessage).toHaveBeenCalledWith('g1', 'hi', null);
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
});
