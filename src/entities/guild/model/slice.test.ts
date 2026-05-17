import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guildReducer, setCurrentGuild } from './slice';

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
    });
  });

  it('should handle setCurrentGuild', () => {
    const prevState = { currentGuildId: null };
    const nextState = guildReducer(prevState, setCurrentGuild('guild-123'));
    
    expect(nextState.currentGuildId).toBe('guild-123');
    expect(localStorage.setItem).toHaveBeenCalledWith('guild-master-current-guild-id', 'guild-123');
  });
});
