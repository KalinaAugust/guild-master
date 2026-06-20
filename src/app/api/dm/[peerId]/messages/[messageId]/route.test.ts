import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from './route';
import { updateDirectMessage } from '@/entities/direct-message/api/updateDirectMessage';
import { deleteDirectMessage } from '@/entities/direct-message/api/deleteDirectMessage';
import { InvalidDirectMessageError } from '@/entities/direct-message/api/createDirectMessage';
import { requireUser } from '@/shared/api/guildAuth';

vi.mock('@/entities/direct-message/api/updateDirectMessage');
vi.mock('@/entities/direct-message/api/deleteDirectMessage');
vi.mock('@/entities/direct-message/api/createDirectMessage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/direct-message/api/createDirectMessage')>();
  return { ...actual };
});
vi.mock('@/shared/api/guildAuth');
beforeEach(() => vi.clearAllMocks());

const params = (peerId: string, messageId: string) => ({
  params: Promise.resolve({ peerId, messageId }),
});
const okAuth = () =>
  vi.mocked(requireUser).mockResolvedValue({ ok: true } as never);

describe('PATCH /api/dm/[peerId]/messages/[messageId]', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 401 }),
    } as never);
    const req = { json: async () => ({ body: 'hi' }) } as unknown as NextRequest;
    const res = await PATCH(req, params('peer1', 'msg1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is not a string', async () => {
    okAuth();
    const req = { json: async () => ({ body: 123 }) } as unknown as NextRequest;
    const res = await PATCH(req, params('peer1', 'msg1'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid message body' });
  });

  it('returns 400 when updateDirectMessage throws InvalidDirectMessageError', async () => {
    okAuth();
    vi.mocked(updateDirectMessage).mockRejectedValue(
      new InvalidDirectMessageError('too long'),
    );
    const req = { json: async () => ({ body: 'x' }) } as unknown as NextRequest;
    const res = await PATCH(req, params('peer1', 'msg1'));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'too long' });
  });

  it('returns 200 with the updated message on success', async () => {
    okAuth();
    const updated = { id: 'msg1', body: 'updated text' };
    vi.mocked(updateDirectMessage).mockResolvedValue(updated as never);
    const req = { json: async () => ({ body: 'updated text' }) } as unknown as NextRequest;
    const res = await PATCH(req, params('peer1', 'msg1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
    expect(updateDirectMessage).toHaveBeenCalledWith('msg1', 'updated text');
  });
});

describe('DELETE /api/dm/[peerId]/messages/[messageId]', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 401 }),
    } as never);
    const req = {} as unknown as NextRequest;
    const res = await DELETE(req, params('peer1', 'msg1'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with { deleted: true } on success', async () => {
    okAuth();
    vi.mocked(deleteDirectMessage).mockResolvedValue(undefined as never);
    const req = {} as unknown as NextRequest;
    const res = await DELETE(req, params('peer1', 'msg1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect(deleteDirectMessage).toHaveBeenCalledWith('msg1');
  });
});
