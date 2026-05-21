import { configureStore } from '@reduxjs/toolkit';
import { calendarReducer } from '@/entities/calendar';
import { eventsReducer } from '@/entities/event';
import { guildReducer } from '@/entities/guild/model/slice';
import eventDetailReducer from '@/features/event-detail/model/slice';

export const store = configureStore({
  reducer: {
    ui: calendarReducer,
    events: eventsReducer,
    guild: guildReducer,
    eventDetail: eventDetailReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
