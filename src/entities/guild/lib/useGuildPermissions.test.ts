import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('../api/guildApi', () => ({
  useGetGuildMembersQuery: vi.fn(),
}));

import { useGetGuildMembersQuery } from '../api/guildApi';
import { useGuildPermissions } from './useGuildPermissions';


describe('useGuildPermissions', () => {
  it('OWNER has elevated permissions', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u1', role: 'OWNER' }],
    } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canManageEvents).toBe(true);
    expect(result.current.canManageMembers).toBe(true);
  });

  it('ADMIN has elevated permissions', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u1', role: 'ADMIN' }],
    } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canManageEvents).toBe(true);
    expect(result.current.canManageMembers).toBe(true);
  });

  it('MEMBER does not have elevated permissions', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u1', role: 'MEMBER' }],
    } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canManageEvents).toBe(false);
    expect(result.current.canManageMembers).toBe(false);
  });

  it('returns false when user is not in members list', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({
      data: [{ userId: 'u2', role: 'OWNER' }],
    } as never);

    const { result } = renderHook(() => useGuildPermissions('g1', 'u1'));
    expect(result.current.canManageEvents).toBe(false);
  });

  it('skips query when guildId is null', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({ data: [] } as never);

    renderHook(() => useGuildPermissions(null, 'u1'));
    expect(useGetGuildMembersQuery).toHaveBeenCalledWith('', { skip: true });
  });

  it('skips query when userId is null', () => {
    vi.mocked(useGetGuildMembersQuery).mockReturnValue({ data: [] } as never);

    renderHook(() => useGuildPermissions('g1', null));
    expect(useGetGuildMembersQuery).toHaveBeenCalledWith('g1', { skip: true });
  });
});
