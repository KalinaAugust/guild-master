import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { fetchEvents } from '@/entities/event/api/getEvents';
import { createEvent } from '@/entities/event/api/createEvent';

vi.mock('@/entities/event/api/getEvents');
vi.mock('@/entities/event/api/createEvent');

const RAW_EVENT = {
  id: 'e1',
  title: 'Raid',
  description: null,
  type: 'raid',
  event_date: '2026-05-22T10:00:00',
  guild_id: 'g1',
  created_by: 'u1',
};

beforeEach(() => vi.clearAllMocks());

describe('GET /api/events', () => {
  it('returns 400 when guildId is missing', async () => {
    const req = { nextUrl: { searchParams: { get: () => null } } } as never;
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns event list for valid guildId', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([RAW_EVENT] as never);
    const req = { nextUrl: { searchParams: { get: () => 'g1' } } } as never;
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe('e1');
  });

  it('returns 500 on fetchEvents error', async () => {
    vi.mocked(fetchEvents).mockRejectedValue(new Error('db error'));
    const req = { nextUrl: { searchParams: { get: () => 'g1' } } } as never;
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe('POST /api/events', () => {
  it('returns 201 with created event', async () => {
    vi.mocked(createEvent).mockResolvedValue(RAW_EVENT as never);
    const req = { json: () => Promise.resolve({ title: 'Raid', guild_id: 'g1' }) } as never;
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe('e1');
  });
});
