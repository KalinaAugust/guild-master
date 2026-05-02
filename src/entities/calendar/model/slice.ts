import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from '@/shared/types';

const initialState: UIState = {
  isEventModalOpen: false,
  selectedDate: null,
  viewDate: new Date().toISOString(),
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
      const date = new Date(state.viewDate);
      date.setMonth(date.getMonth() + 1);
      state.viewDate = date.toISOString();
    },
    prevMonth: (state) => {
      const date = new Date(state.viewDate);
      date.setMonth(date.getMonth() - 1);
      state.viewDate = date.toISOString();
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
