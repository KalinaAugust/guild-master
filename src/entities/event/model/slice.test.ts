import { describe, it, expect } from 'vitest';
import eventsReducer, { addEvent } from './slice';
import { EventsState, ActivityEvent } from '@/shared/types';

describe('eventsSlice', () => {
  it('should return the initial state', () => {
    const state = eventsReducer(undefined, { type: 'unknown' });
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
    expect(state.items.length).toBeGreaterThan(0);
  });

  it('should handle addEvent', () => {
    const initialState: EventsState = {
      items: [],
      loading: false,
      error: null,
    };
    const newEvent: ActivityEvent = {
      id: 'test-1',
      title: 'Test Event',
      date: '2026-05-03',
      time: '12:00',
      type: 'game',
      description: 'Test description',
    };
    
    const actual = eventsReducer(initialState, addEvent(newEvent));
    expect(actual.items).toHaveLength(1);
    expect(actual.items[0]).toEqual(newEvent);
  });
});
