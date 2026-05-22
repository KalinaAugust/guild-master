import { configureStore } from '@reduxjs/toolkit';
import { calendarReducer } from '@/entities/calendar';
import { eventsReducer } from '@/entities/event';
import { guildReducer } from '@/entities/guild/model/slice';
import eventDetailReducer from '@/features/event-detail/model/slice';
import { baseApi } from '@/shared/api/baseApi';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    ui: calendarReducer,
    events: eventsReducer,
    guild: guildReducer,
    eventDetail: eventDetailReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
