import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeAddParticipants } from './executeAddParticipants';
import { getGuildMembers } from '@/entities/guild/api/getGuildMembers';
import { getEventParticipantUserIds } from '@/entities/event/api/getEventParticipantUserIds';
import { syncParticipants } from '@/entities/event/api/syncParticipants';

vi.mock('@/entities/guild/api/getGuildMembers');
vi.mock('@/entities/event/api/getEventParticipantUserIds');
vi.mock('@/entities/event/api/syncParticipants');

const members = (ids: string[]) =>
  ids.map((id) => ({
    userId: id,
    role: 'MEMBER' as const,
    profile: { publicId: null, fullName: id, avatarUrl: null, alias: null, displayAsAlias: false, icon: null, about: null },
  }));

describe('executeAddParticipants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unions new members with existing participants and syncs', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue(members(['u1', 'u2', 'u3']) as never);
    vi.mocked(getEventParticipantUserIds).mockResolvedValue(['u1']);
    vi.mocked(syncParticipants).mockResolvedValue(undefined);

    const result = await executeAddParticipants({ eventId: 'e1', userIds: ['u2', 'u3'] }, 'g1');

    expect(syncParticipants).toHaveBeenCalledWith('e1', ['u1', 'u2', 'u3']);
    expect(result).toEqual({ success: true, eventId: 'e1', addedCount: 2 });
  });

  it('ignores ids that are not guild members', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue(members(['u1', 'u2']) as never);
    vi.mocked(getEventParticipantUserIds).mockResolvedValue([]);
    vi.mocked(syncParticipants).mockResolvedValue(undefined);

    const result = await executeAddParticipants({ eventId: 'e1', userIds: ['u2', 'stranger'] }, 'g1');

    expect(syncParticipants).toHaveBeenCalledWith('e1', ['u2']);
    expect(result).toEqual({ success: true, eventId: 'e1', addedCount: 1 });
  });

  it('does not count already-present members as added', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue(members(['u1', 'u2']) as never);
    vi.mocked(getEventParticipantUserIds).mockResolvedValue(['u1', 'u2']);
    vi.mocked(syncParticipants).mockResolvedValue(undefined);

    const result = await executeAddParticipants({ eventId: 'e1', userIds: ['u2'] }, 'g1');

    expect(result).toEqual({ success: true, eventId: 'e1', addedCount: 0 });
  });

  it('errors when userIds is empty', async () => {
    const result = await executeAddParticipants({ eventId: 'e1', userIds: [] }, 'g1');
    expect(result.success).toBe(false);
    expect(syncParticipants).not.toHaveBeenCalled();
  });

  it('errors when no requested id is a guild member', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue(members(['u1']) as never);
    const result = await executeAddParticipants({ eventId: 'e1', userIds: ['stranger'] }, 'g1');
    expect(result.success).toBe(false);
    expect(syncParticipants).not.toHaveBeenCalled();
  });

  it('returns error on failure', async () => {
    vi.mocked(getGuildMembers).mockResolvedValue(members(['u1']) as never);
    vi.mocked(getEventParticipantUserIds).mockRejectedValue(new Error('db error'));
    const result = await executeAddParticipants({ eventId: 'e1', userIds: ['u1'] }, 'g1');
    expect(result).toEqual({ success: false, error: 'db error' });
  });
});
