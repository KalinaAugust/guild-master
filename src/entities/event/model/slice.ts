import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EventsState, ActivityEvent } from '@/shared/types';

const initialState: EventsState = {
  items: [],
  loading: false,
  error: null,
};

export const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    addEvent: (state, action: PayloadAction<ActivityEvent>) => {
      state.items.push(action.payload);
    },
  },
});

export const { addEvent } = eventsSlice.actions;
export default eventsSlice.reducer;
