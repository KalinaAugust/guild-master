import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UIState } from '@/types';

const initialState: UIState = {
  isEventModalOpen: false,
  selectedDate: null,
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
  },
});

export const { openEventModal, closeEventModal, setSelectedDate } = uiSlice.actions;
export default uiSlice.reducer;
