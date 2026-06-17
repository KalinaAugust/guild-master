import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { launchCallToAction } from '@/entities/call-to-action/api/launchCallToAction';
import { requireUser } from '@/shared/api/guildAuth';

vi.mock('@/entities/call-to-action/api/launchCallToAction');
vi.mock('@/shared/api/guildAuth');
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: 'u1' } } as never);
});

const params = (id: string, ctaId: string) => ({ params: Promise.resolve({ id, ctaId }) });

describe('POST /api/guilds/[id]/call-to-actions/[ctaId]/launch', () => {
  it('launches the CTA and returns 200', async () => {
    vi.mocked(launchCallToAction).mockResolvedValue({ id: 'c1', eventId: 'e9' } as never);
    const res = await POST({} as never, params('g1', 'c1'));
    expect(res.status).toBe(200);
    expect(launchCallToAction).toHaveBeenCalledWith('c1');
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) } as never);
    const res = await POST({} as never, params('g1', 'c1'));
    expect(res.status).toBe(401);
    expect(launchCallToAction).not.toHaveBeenCalled();
  });

  it('returns 500 on failure', async () => {
    vi.mocked(launchCallToAction).mockRejectedValue(new Error('nope'));
    expect((await POST({} as never, params('g1', 'c1'))).status).toBe(500);
  });
});
