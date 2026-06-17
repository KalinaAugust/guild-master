import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, ActivityEvent, ActivityType } from '@/shared/types';
import dayjs from 'dayjs';

const ALL_TYPES: ActivityType[] = ['game', 'meeting', 'other', 'party', 'sport', 'dnd', 'boardgame'];

const initialState: UIState = {
  isEventModalOpen: false,
  selectedDate: null,
  viewDate: dayjs().toISOString(),
  excludedEventTypes: [],
  onlyParticipating: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openEventModal: (state, action: PayloadAction<ActivityEvent | undefined>) => {
      state.isEventModalOpen = true;
      state.editingEvent = action.payload;
      if (action.payload) {
        state.selectedDate = action.payload.date;
      }
    },
    closeEventModal: (state) => {
      state.isEventModalOpen = false;
      state.editingEvent = undefined;
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
    nextMonth: (state) => {
      state.viewDate = dayjs(state.viewDate).add(1, 'month').toISOString();
    },
    prevMonth: (state) => {
      state.viewDate = dayjs(state.viewDate).subtract(1, 'month').toISOString();
    },
    setViewDate: (state, action: PayloadAction<string>) => {
      state.viewDate = action.payload;
    },
    toggleEventType: (state, action: PayloadAction<ActivityType>) => {
      const type = action.payload;
      if (state.excludedEventTypes.includes(type)) {
        state.excludedEventTypes = state.excludedEventTypes.filter(t => t !== type);
      } else {
        state.excludedEventTypes.push(type);
      }
    },
    toggleOnlyParticipating: (state) => {
      state.onlyParticipating = !state.onlyParticipating;
    },
    setAllEventTypesEnabled: (state, action: PayloadAction<boolean>) => {
      if (action.payload) {
        state.excludedEventTypes = [];
      } else {
        state.excludedEventTypes = [...ALL_TYPES];
      }
    },
  },
});

export const {
  openEventModal,
  closeEventModal,
  setSelectedDate,
  nextMonth,
  prevMonth,
  setViewDate,
  toggleEventType,
  setAllEventTypesEnabled,
  toggleOnlyParticipating,
} = uiSlice.actions;
export default uiSlice.reducer;

