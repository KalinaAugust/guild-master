import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { guildReducer } from '@/entities/guild/model/slice';
import { useGuildSelection } from './useGuildSelection';
import type { Guild } from '@/entities/guild';
import React from 'react';

function makeStore(currentGuildId: string | null = null) {
  return configureStore({
    reducer: { guild: guildReducer },
    preloadedState: {
      guild: { currentGuildId, isGuildEditModalOpen: false, editingGuild: null },
    },
  });
}

function wrapper(store: ReturnType<typeof makeStore>) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

const guilds: Guild[] = [
  { id: 'g1', name: 'Alpha', ownerId: 'u1' },
  { id: 'g2', name: 'Beta', ownerId: 'u1' },
];

describe('useGuildSelection', () => {
  it('activeGuildId falls back to first guild when no currentGuildId', () => {
    const store = makeStore(null);
    const { result } = renderHook(() => useGuildSelection(guilds), { wrapper: wrapper(store) });
    expect(result.current.activeGuildId).toBe('g1');
  });

  it('activeGuildId uses currentGuildId when set', () => {
    const store = makeStore('g2');
    const { result } = renderHook(() => useGuildSelection(guilds), { wrapper: wrapper(store) });
    expect(result.current.activeGuildId).toBe('g2');
  });

  it('guildOptions maps guilds to label/value pairs', () => {
    const store = makeStore();
    const { result } = renderHook(() => useGuildSelection(guilds), { wrapper: wrapper(store) });
    expect(result.current.guildOptions).toEqual([
      expect.objectContaining({ label: 'Alpha', value: 'g1' }),
      expect.objectContaining({ label: 'Beta', value: 'g2' }),
    ]);
  });

  it('handleGuildChange dispatches setCurrentGuild', () => {
    const store = makeStore();
    const { result } = renderHook(() => useGuildSelection(guilds), { wrapper: wrapper(store) });
    act(() => result.current.handleGuildChange('g2'));
    expect(store.getState().guild.currentGuildId).toBe('g2');
  });

  it('activeGuildId is undefined when guilds is empty and no currentGuildId', () => {
    const store = makeStore(null);
    const { result } = renderHook(() => useGuildSelection([]), { wrapper: wrapper(store) });
    expect(result.current.activeGuildId).toBeUndefined();
  });
});
