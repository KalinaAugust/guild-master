import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventParticipants } from './getEventParticipants';
import { createClient } from '@/shared/api/supabase/server';
import { query, mockClient } from '@/shared/lib/test/supabaseMock';

vi.mock('@/shared/api/supabase/server');
beforeEach(() => vi.clearAllMocks());

const useClient = (user: { id: string } | null, from: ReturnType<typeof vi.fn>) =>
  vi.mocked(createClient).mockResolvedValue(mockClient({ user, from }) as never);

describe('getEventParticipants', () => {
  it('throws when not authenticated', async () => {
    useClient(null, vi.fn());
    await expect(getEventParticipants('e1')).rejects.toThrow('Not authenticated');
  });

  it('maps participants and resolves viewer flags', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: [
        { id: 'p1', event_id: 'e1', user_id: 'u2', status: 'confirmed', profiles: { public_id: 'pub2', full_name: 'Bob', avatar_url: 'a.png', alias: null, display_as_alias: false } },
      ] }))
      .mockReturnValueOnce(query({ data: { guild_id: 'g1' } }))  // event row
      .mockReturnValueOnce(query({ data: { id: 'm1' } }))        // membership -> member
      .mockReturnValueOnce(query({ data: null }));               // no pending request
    useClient({ id: 'u1' }, from);

    const result = await getEventParticipants('e1');
    expect(result.currentUserId).toBe('u1');
    expect(result.viewerIsGuildMember).toBe(true);
    expect(result.viewerHasPendingRequest).toBe(false);
    expect(result.participants).toEqual([
      { id: 'p1', event_id: 'e1', user_id: 'u2', status: 'confirmed', profile: { publicId: 'pub2', fullName: 'Bob', avatarUrl: 'a.png', alias: null, displayAsAlias: false } },
    ]);
  });

  it('reports a pending request for the viewer', async () => {
    const from = vi.fn()
      .mockReturnValueOnce(query({ data: [] }))
      .mockReturnValueOnce(query({ data: { guild_id: 'g1' } }))
      .mockReturnValueOnce(query({ data: null }))               // not a member
      .mockReturnValueOnce(query({ data: { id: 'jr1' } }));     // pending request
    useClient({ id: 'u1' }, from);

    const result = await getEventParticipants('e1');
    expect(result.viewerIsGuildMember).toBe(false);
    expect(result.viewerHasPendingRequest).toBe(true);
    expect(result.participants).toEqual([]);
  });
});
