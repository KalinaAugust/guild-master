import { describe, it, expect } from 'vitest';
import eventsReducer, { addEvent, createEventThunk, updateEventThunk, deleteEventThunk } from './slice';
import { EventsState, ActivityEvent } from '@/shared/types';

describe('eventsSlice', () => {
  it('should return the initial state', () => {
    const state = eventsReducer(undefined, { type: 'unknown' });
    expect(state.loading).toBe(false);
    expect(state.error).toBe(null);
    expect(state.items.length).toBe(0);
  });

  it('should handle addEvent', () => {
    const initialState: EventsState = {
      isInitialized: false,
      items: [],
      loading: false,
      error: null
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

  it('should handle createEventThunk.fulfilled', () => {
    const initialState: EventsState = {
      isInitialized: false,
      items: [],
      loading: false,
      error: null
    };
    const newEvent: ActivityEvent = {
      id: 'new-id',
      title: 'New Event',
      date: '2026-05-04',
      time: '18:00',
      type: 'raid',
      description: 'New description',
    };

    const action = { type: createEventThunk.fulfilled.type, payload: newEvent };
    const actual = eventsReducer(initialState, action);
    expect(actual.items).toHaveLength(1);
    expect(actual.items[0]).toEqual(newEvent);
  });

  it('should handle updateEventThunk.fulfilled', () => {
    const existingEvent: ActivityEvent = {
      id: 'existing-id',
      title: 'Existing Event',
      date: '2026-05-03',
      time: '12:00',
      type: 'game',
      description: 'Existing description',
    };
    const initialState: EventsState = {
      isInitialized: true,
      items: [existingEvent],
      loading: false,
      error: null
    };
    const updatedEvent: ActivityEvent = {
      ...existingEvent,
      title: 'Updated Event',
    };

    const action = { type: updateEventThunk.fulfilled.type, payload: updatedEvent };
    const actual = eventsReducer(initialState, action);
    expect(actual.items).toHaveLength(1);
    expect(actual.items[0].title).toBe('Updated Event');
    expect(actual.items[0].id).toBe('existing-id');
  });

  it('should handle deleteEventThunk.fulfilled', () => {
    const existingEvent: ActivityEvent = {
      id: 'id-to-delete',
      title: 'Event to Delete',
      date: '2026-05-03',
      time: '12:00',
      type: 'game',
    };
    const initialState: EventsState = {
      isInitialized: true,
      items: [existingEvent],
      loading: false,
      error: null
    };

    const action = { type: deleteEventThunk.fulfilled.type, payload: 'id-to-delete' };
    const actual = eventsReducer(initialState, action);
    expect(actual.items).toHaveLength(0);
  });
});
