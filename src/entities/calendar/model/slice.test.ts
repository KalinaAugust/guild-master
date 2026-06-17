import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import reducer, {
  openEventModal,
  closeEventModal,
  setSelectedDate,
  nextMonth,
  prevMonth,
  setViewDate,
  toggleEventType,
  setAllEventTypesEnabled,
  toggleOnlyParticipating,
} from './slice';

describe('uiSlice', () => {
  const initialState = {
    isEventModalOpen: false,
    selectedDate: null,
    viewDate: dayjs('2026-05-01').toISOString(),
    excludedEventTypes: [],
    onlyParticipating: false,
  };

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(expect.objectContaining({
      isEventModalOpen: false,
      excludedEventTypes: [],
    }));
  });

  it('should handle openEventModal', () => {
    const actual = reducer(initialState, openEventModal());
    expect(actual.isEventModalOpen).toBe(true);
  });

  it('should handle closeEventModal', () => {
    const state = { ...initialState, isEventModalOpen: true };
    const actual = reducer(state, closeEventModal());
    expect(actual.isEventModalOpen).toBe(false);
  });

  it('should handle setSelectedDate', () => {
    const selectedDate = '2026-05-15';
    const actual = reducer(initialState, setSelectedDate(selectedDate));
    expect(actual.selectedDate).toBe(selectedDate);
  });

  it('should handle nextMonth', () => {
    const actual = reducer(initialState, nextMonth());
    const expectedDate = dayjs('2026-05-01').add(1, 'month').toISOString();
    expect(actual.viewDate).toBe(expectedDate);
  });

  it('should handle prevMonth', () => {
    const actual = reducer(initialState, prevMonth());
    const expectedDate = dayjs('2026-05-01').subtract(1, 'month').toISOString();
    expect(actual.viewDate).toBe(expectedDate);
  });

  it('should handle setViewDate', () => {
    const newDate = '2026-06-01T00:00:00.000Z';
    const actual = reducer(initialState, setViewDate(newDate));
    expect(actual.viewDate).toBe(newDate);
  });

  it('should handle toggleEventType', () => {
    let state = reducer(undefined, toggleEventType('game'));
    expect(state.excludedEventTypes).toEqual(['game']);

    state = reducer(state, toggleEventType('game'));
    expect(state.excludedEventTypes).toEqual([]);
  });

  it('should handle setAllEventTypesEnabled', () => {
    let state = reducer(undefined, setAllEventTypesEnabled(false));
    expect(state.excludedEventTypes).toEqual(['game', 'meeting', 'other', 'party', 'sport', 'dnd', 'boardgame']);

    state = reducer(state, setAllEventTypesEnabled(true));
    expect(state.excludedEventTypes).toEqual([]);
  });

  it('should handle toggleOnlyParticipating', () => {
    let state = reducer(undefined, toggleOnlyParticipating());
    expect(state.onlyParticipating).toBe(true);

    state = reducer(state, toggleOnlyParticipating());
    expect(state.onlyParticipating).toBe(false);
  });
});

