import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from '@/shared/types';
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
    openEventModal: (state) => {
      state.isEventModalOpen = true;
    },
    closeEventModal: (state) => {
      state.isEventModalOpen = false;
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
  setViewDate
} = uiSlice.actions;
export default uiSlice.reducer;
