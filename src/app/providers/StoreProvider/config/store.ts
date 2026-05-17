import { configureStore } from '@reduxjs/toolkit';
import { calendarReducer } from '@/entities/calendar';
import { eventsReducer } from '@/entities/event';
import { guildReducer } from '@/entities/guild/model/slice';

export const store = configureStore({
  reducer: {
    ui: calendarReducer,
    events: eventsReducer,
    guild: guildReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
