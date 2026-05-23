import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState, ActivityEvent } from '@/shared/types';
import dayjs from 'dayjs';

const initialState: UIState = {
  isEventModalOpen: false,
  selectedDate: null,
  viewDate: dayjs().toISOString(),
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
  },
});

export const {
  openEventModal,
  closeEventModal,
  setSelectedDate,
  nextMonth,
  prevMonth,
  setViewDate,
} = uiSlice.actions;
export default uiSlice.reducer;
