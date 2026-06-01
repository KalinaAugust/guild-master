import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guildReducer, setCurrentGuild, openGuildEditModal, closeGuildEditModal } from './slice';
import type { Guild } from './types';

describe('guildSlice', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  it('should return the initial state', () => {
    expect(guildReducer(undefined, { type: 'unknown' })).toEqual({
      currentGuildId: null,
      isGuildEditModalOpen: false,
      editingGuild: null,
    });
  });

  it('should handle setCurrentGuild', () => {
    const prevState = { currentGuildId: null };
    const nextState = guildReducer(prevState, setCurrentGuild('guild-123'));

    expect(nextState.currentGuildId).toBe('guild-123');
    expect(localStorage.setItem).toHaveBeenCalledWith('guild-master-current-guild-id', 'guild-123');
  });

  it('should handle openGuildEditModal', () => {
    const guild: Guild = { id: 'g1', name: 'Alpha', ownerId: 'u1' };
    const state = { currentGuildId: null, isGuildEditModalOpen: false, editingGuild: null };
    const next = guildReducer(state, openGuildEditModal(guild));
    expect(next.isGuildEditModalOpen).toBe(true);
    expect(next.editingGuild).toEqual(guild);
  });

  it('should handle closeGuildEditModal', () => {
    const guild: Guild = { id: 'g1', name: 'Alpha', ownerId: 'u1' };
    const state = { currentGuildId: null, isGuildEditModalOpen: true, editingGuild: guild };
    const next = guildReducer(state, closeGuildEditModal());
    expect(next.isGuildEditModalOpen).toBe(false);
    expect(next.editingGuild).toBeNull();
  });
});
