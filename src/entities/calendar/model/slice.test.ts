import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import reducer, {
  openEventModal,
  closeEventModal,
  setSelectedDate,
  nextMonth,
  prevMonth,
  setViewDate,
  openEventDetail,
  closeEventDetail,
} from './slice';
import { ActivityEvent } from '@/shared/types';

describe('uiSlice', () => {
  const initialState = {
    isEventModalOpen: false,
    selectedDate: null,
    viewDate: dayjs('2026-05-01').toISOString(),
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

  it('should handle openEventDetail', () => {
    const event: ActivityEvent = {
      id: '1', title: 'Raid', date: '2026-05-28', time: '20:00', type: 'raid',
    };
    const actual = reducer(
      { ...initialState, isEventDetailOpen: false, viewingEvent: null },
      openEventDetail(event)
    );
    expect(actual.isEventDetailOpen).toBe(true);
    expect(actual.viewingEvent).toEqual(event);
  });

  it('should handle closeEventDetail', () => {
    const state = {
      ...initialState,
      isEventDetailOpen: true,
      viewingEvent: { id: '1', title: 'Raid', date: '2026-05-28', time: '20:00', type: 'raid' as const },
    };
    const actual = reducer(state, closeEventDetail());
    expect(actual.isEventDetailOpen).toBe(false);
    expect(actual.viewingEvent).toBeNull();
  });
});
