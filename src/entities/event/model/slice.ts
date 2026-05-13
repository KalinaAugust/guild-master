import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { EventsState, ActivityEvent, ActivityType } from '@/shared/types';
import { fetchEvents } from '../api/getEvents';
import { createEvent } from '../api/createEvent';
import dayjs from '@/shared/lib/dayjs';

export const fetchEventsThunk = createAsyncThunk(
  'events/fetchEvents',
  async (guildId: string) => {
    const data = await fetchEvents(guildId);
    if (!data) return [];
    
    return data.map(event => {
      const d = dayjs(event.event_date);
      return {
        id: event.id,
        title: event.title,
        description: event.description || undefined,
        type: event.type as ActivityType,
        date: d.format('YYYY-MM-DD'),
        time: d.format('HH:mm'),
      };
    });
  }
);

export const createEventThunk = createAsyncThunk(
  'events/createEvent',
  async (event: Omit<ActivityEvent, 'id'> & { guild_id: string }) => {
    const data = await createEvent(event);
    const d = dayjs(data.event_date);
    return {
      id: data.id,
      title: data.title,
      description: data.description || undefined,
      type: data.type as ActivityType,
      date: d.format('YYYY-MM-DD'),
      time: d.format('HH:mm'),
    };
  }
);

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
  extraReducers: (builder) => {
    builder
      .addCase(fetchEventsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEventsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchEventsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch events';
      })
      .addCase(createEventThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEventThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
      })
      .addCase(createEventThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create event';
      });
  },
});

export const { addEvent } = eventsSlice.actions;
export default eventsSlice.reducer;

