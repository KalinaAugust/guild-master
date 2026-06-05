import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, POST } from './route';
import { getEventParticipants } from '@/features/event-detail/api/getEventParticipants';
import { updateParticipantStatus } from '@/features/event-detail/api/updateParticipantStatus';
import { addSelfAsParticipant } from '@/features/event-detail/api/addSelfAsParticipant';

vi.mock('@/features/event-detail/api/getEventParticipants');
vi.mock('@/features/event-detail/api/updateParticipantStatus');
vi.mock('@/features/event-detail/api/addSelfAsParticipant');
beforeEach(() => vi.clearAllMocks());

const params = (eventId: string) => ({ params: Promise.resolve({ eventId }) });
const body = (b: unknown) => ({ json: () => Promise.resolve(b) }) as never;

describe('GET /api/participants/[eventId]', () => {
  it('returns participant payload', async () => {
    vi.mocked(getEventParticipants).mockResolvedValue({ participants: [] } as never);
    const res = await GET({} as never, params('e1'));
    expect(res.status).toBe(200);
  });
  it('returns 500 on failure', async () => {
    vi.mocked(getEventParticipants).mockRejectedValue(new Error('nope'));
    expect((await GET({} as never, params('e1'))).status).toBe(500);
  });
});

describe('PATCH /api/participants/[eventId]', () => {
  it('updates status and returns 200', async () => {
    vi.mocked(updateParticipantStatus).mockResolvedValue();
    const res = await PATCH(body({ status: 'confirmed' }), params('e1'));
    expect(res.status).toBe(200);
    expect(updateParticipantStatus).toHaveBeenCalledWith('e1', 'confirmed');
  });
  it('returns 500 on failure', async () => {
    vi.mocked(updateParticipantStatus).mockRejectedValue(new Error('x'));
    expect((await PATCH(body({ status: 'declined' }), params('e1'))).status).toBe(500);
  });
});

describe('POST /api/participants/[eventId]', () => {
  it('adds self and returns 201', async () => {
    vi.mocked(addSelfAsParticipant).mockResolvedValue();
    expect((await POST({} as never, params('e1'))).status).toBe(201);
  });
  it('returns 500 on failure', async () => {
    vi.mocked(addSelfAsParticipant).mockRejectedValue(new Error('x'));
    expect((await POST({} as never, params('e1'))).status).toBe(500);
  });
});
