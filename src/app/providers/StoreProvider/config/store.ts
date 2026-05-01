import { configureStore } from '@reduxjs/toolkit';
import { calendarReducer } from '@/entities/calendar';
import { eventsReducer } from '@/entities/event';

export const store = configureStore({
  reducer: {
    ui: calendarReducer,
    events: eventsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
