import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import eventsReducer from './slices/eventsSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    events: eventsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
