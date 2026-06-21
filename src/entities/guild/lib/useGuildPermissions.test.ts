import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../api/guildApi', () => ({
  useGetGuildMembersQuery: vi.fn(),
  useGetGuildsQuery: vi.fn(),
}));

import { useGetGuildMembersQuery, useGetGuildsQuery } from '../api/guildApi';
import { useGuildPermissions } from './useGuildPermissions';

const defaultPermissions = null; // null => all defaults: events=officers, polls=all

const guildWithDefaultPerms = [{ id: 'g1', permissions: defaultPermissions }];
const guildWithAllPerms = [{ id: 'g1', permissions: { events: 'all', announcements: 'all', polls: 'all', call_to_actions: 'all' } }];
const guildWithOwnerOnlyPerms = [{ id: 'g1', permissions: { events: 'owner', announcements: 'owner', polls: 'owner', call_to_actions: 'owner' } }];

describe('useGuildPermissions', () => {
  it('OWNER has elevated permissions', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u1', role: 'OWNER' }],
    } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: guildWithDefaultPerms } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canEditEvents).toBe(true);
    expect(result.current.canDeleteEvents).toBe(true);
    expect(result.current.canManageMembers).toBe(true);
  });

  it('ADMIN has elevated permissions', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u1', role: 'ADMIN' }],
    } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: guildWithDefaultPerms } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canEditEvents).toBe(true);
    expect(result.current.canDeleteEvents).toBe(true);
    expect(result.current.canManageMembers).toBe(true);
  });

  it('MEMBER does not have elevated permissions', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u1', role: 'MEMBER' }],
    } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: guildWithDefaultPerms } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canEditEvents).toBe(false);
    expect(result.current.canDeleteEvents).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });

  it('returns false when user is not in members list', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u2', role: 'OWNER' }],
    } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: guildWithDefaultPerms } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canEditEvents).toBe(false);
    expect(result.current.canDeleteEvents).toBe(false);
  });

  it('skips query when guildId is null', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({ data: [] } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: [] } as never);

    renderHook(() => useGuildPermissions(null, 'u1'));
    expect(useGetGuildMembersQuery).toHaveBeenCalledWith('', { skip: true });
  });

  it('skips query when userId is null', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({ data: [] } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: [] } as never);

    renderHook(() => useGuildPermissions('g1', null));
    expect(useGetGuildMembersQuery).toHaveBeenCalledWith('g1', { skip: true });
  });

  // canCreate* flags — default permissions: events=officers, polls/cta=all
  it('MEMBER with default permissions: canCreatePolls=true, canCreateEvents=false', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u1', role: 'MEMBER' }],
    } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: guildWithDefaultPerms } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canCreatePolls).toBe(true);
    expect(result.current.canCreateCallToActions).toBe(true);
    expect(result.current.canCreateEvents).toBe(false);
    expect(result.current.canCreateAnnouncements).toBe(false);
  });

  it('ADMIN with default permissions: canCreateEvents=true', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u1', role: 'ADMIN' }],
    } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: guildWithDefaultPerms } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canCreateEvents).toBe(true);
    expect(result.current.canCreateAnnouncements).toBe(true);
    expect(result.current.canCreatePolls).toBe(true);
  });

  it('MEMBER with all=all permissions: all canCreate* flags true', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u1', role: 'MEMBER' }],
    } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: guildWithAllPerms } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canCreateEvents).toBe(true);
    expect(result.current.canCreateAnnouncements).toBe(true);
    expect(result.current.canCreatePolls).toBe(true);
    expect(result.current.canCreateCallToActions).toBe(true);
  });

  it('ADMIN with owner-only permissions: all canCreate* flags false', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u1', role: 'ADMIN' }],
    } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: guildWithOwnerOnlyPerms } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canCreateEvents).toBe(false);
    expect(result.current.canCreateAnnouncements).toBe(false);
    expect(result.current.canCreatePolls).toBe(false);
    expect(result.current.canCreateCallToActions).toBe(false);
  });

  it('canCreate* flags all false when user not in guild', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u2', role: 'OWNER' }],
    } as never);
    vi.mocked(useGetGuildsQuery).mockReturnValue({ data: guildWithAllPerms } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canCreateEvents).toBe(false);
    expect(result.current.canCreateAnnouncements).toBe(false);
    expect(result.current.canCreatePolls).toBe(false);
    expect(result.current.canCreateCallToActions).toBe(false);
  });
});
