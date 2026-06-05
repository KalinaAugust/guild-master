import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { PATCH } from './route';
import { requireUser } from '@/shared/api/guildAuth';

vi.mock('@/shared/api/guildAuth');
function query(result: { data?: unknown; error?: unknown; count?: number }) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'delete', 'insert', 'update', 'upsert', 'in', 'order', 'limit']) {
    b[m] = vi.fn(() => b);
  }
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (resolve: (v: unknown) => void) => resolve(result);
  return b;
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });
beforeEach(() => vi.clearAllMocks());

describe('PATCH /api/notifications/[id]/read', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    expect((await PATCH({} as never, params('n1'))).status).toBe(401);
  });

  it('marks one as read and returns ok', async () => {
    const from = vi.fn().mockReturnValue(query({ error: null }));
    vi.mocked(requireUser).mockResolvedValue({ ok: true, supabase: { from } as never, user: { id: 'u1' } as never });
    const res = await PATCH({} as never, params('n1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns 500 on db error', async () => {
    const from = vi.fn().mockReturnValue(query({ error: { message: 'boom' } }));
    vi.mocked(requireUser).mockResolvedValue({ ok: true, supabase: { from } as never, user: { id: 'u1' } as never });
    expect((await PATCH({} as never, params('n1'))).status).toBe(500);
  });
});
