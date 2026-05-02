import { describe, it, expect } from 'vitest';
import reducer, { 
  openEventModal, 
  closeEventModal, 
  setSelectedDate,
  nextMonth,
  prevMonth,
  setViewDate 
} from './slice';

describe('uiSlice', () => {
  const initialState = {
    isEventModalOpen: false,
    selectedDate: null,
    viewDate: new Date('2026-05-01').toISOString(),
  };

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(expect.objectContaining({
      isEventModalOpen: false,
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
    const expectedDate = new Date('2026-05-01');
    expectedDate.setMonth(expectedDate.getMonth() + 1);
    expect(actual.viewDate).toBe(expectedDate.toISOString());
  });

  it('should handle prevMonth', () => {
    const actual = reducer(initialState, prevMonth());
    const expectedDate = new Date('2026-05-01');
    expectedDate.setMonth(expectedDate.getMonth() - 1);
    expect(actual.viewDate).toBe(expectedDate.toISOString());
  });

  it('should handle setViewDate', () => {
    const newDate = '2026-06-01T00:00:00.000Z';
    const actual = reducer(initialState, setViewDate(newDate));
    expect(actual.viewDate).toBe(newDate);
  });
});
