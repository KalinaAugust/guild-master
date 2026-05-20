import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { EventsState, ActivityEvent, ActivityType } from '@/shared/types';
import { fetchEvents } from '../api/getEvents';
import { createEvent } from '../api/createEvent';
import { updateEvent } from '../api/updateEvent';
import { deleteEvent } from '../api/deleteEvent';
import dayjs from '@/shared/lib/dayjs';

export const fetchEventsThunk = createAsyncThunk(
  'events/fetchEvents',
  async (guildId: string) => {
    const data = await fetchEvents(guildId);
    if (!data) return [];
    
    return data.map(event => {
      const d = dayjs.utc(event.event_date);
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
    const d = dayjs.utc(data.event_date);
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

export const updateEventThunk = createAsyncThunk(
  'events/updateEvent',
  async ({ id, event }: { id: string, event: Partial<Omit<ActivityEvent, 'id'>> }) => {
    const data = await updateEvent(id, event);
    const d = dayjs.utc(data.event_date);
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

export const deleteEventThunk = createAsyncThunk(
  'events/deleteEvent',
  async (id: string) => {
    await deleteEvent(id);
    return id;
  }
);

const initialState: EventsState = {
  items: [],
  loading: false,
  error: null,
  isInitialized: false,
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
        state.isInitialized = true;
      })
      .addCase(fetchEventsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch events';
        state.isInitialized = true;
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
      })
      .addCase(updateEventThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEventThunk.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateEventThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update event';
      })
      .addCase(deleteEventThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEventThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      .addCase(deleteEventThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete event';
      });
  },
});

export const { addEvent } = eventsSlice.actions;
export default eventsSlice.reducer;
