import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from './route';
import { getEventById } from '@/entities/event/api/getEventById';
import { updateEvent } from '@/entities/event/api/updateEvent';
import { deleteEvent } from '@/entities/event/api/deleteEvent';

vi.mock('@/entities/event/api/getEventById');
vi.mock('@/entities/event/api/updateEvent');
vi.mock('@/entities/event/api/deleteEvent');
beforeEach(() => vi.clearAllMocks());

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const body = (b: unknown) => ({ json: () => Promise.resolve(b) }) as never;

describe('GET /api/events/[id]', () => {
  it('returns the event', async () => {
    vi.mocked(getEventById).mockResolvedValue({ id: 'e1' } as never);
    const res = await GET({} as never, params('e1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'e1' });
  });
  it('returns 404 when missing', async () => {
    vi.mocked(getEventById).mockResolvedValue(null as never);
    expect((await GET({} as never, params('e1'))).status).toBe(404);
  });
  it('returns 500 on error', async () => {
    vi.mocked(getEventById).mockRejectedValue(new Error('x'));
    expect((await GET({} as never, params('e1'))).status).toBe(500);
  });
});

describe('PATCH /api/events/[id]', () => {
  it('updates and returns the event', async () => {
    vi.mocked(updateEvent).mockResolvedValue({ id: 'e1', title: 'New' } as never);
    const res = await PATCH(body({ title: 'New' }), params('e1'));
    expect(res.status).toBe(200);
    expect(updateEvent).toHaveBeenCalledWith('e1', { title: 'New' });
  });
  it('returns 500 on error', async () => {
    vi.mocked(updateEvent).mockRejectedValue(new Error('x'));
    expect((await PATCH(body({}), params('e1'))).status).toBe(500);
  });
});

describe('DELETE /api/events/[id]', () => {
  it('deletes and returns the id', async () => {
    vi.mocked(deleteEvent).mockResolvedValue(undefined as never);
    const res = await DELETE({} as never, params('e1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 'e1' });
  });
  it('returns 500 on error', async () => {
    vi.mocked(deleteEvent).mockRejectedValue(new Error('x'));
    expect((await DELETE({} as never, params('e1'))).status).toBe(500);
  });
});
