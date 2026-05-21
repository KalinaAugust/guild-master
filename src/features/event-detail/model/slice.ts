import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { EventParticipant } from '@/shared/types';
import { getEventParticipants } from '../api/getEventParticipants';
import { updateParticipantStatus } from '../api/updateParticipantStatus';

interface EventDetailState {
  participants: EventParticipant[];
  currentUserId: string;
  loading: boolean;
  error: string | null;
}

const initialState: EventDetailState = {
  participants: [],
  currentUserId: '',
  loading: false,
  error: null,
};

export const fetchParticipantsThunk = createAsyncThunk(
  'eventDetail/fetchParticipants',
  async (eventId: string) => getEventParticipants(eventId)
);

export const updateParticipantStatusThunk = createAsyncThunk(
  'eventDetail/updateStatus',
  async ({ eventId, status }: { eventId: string; status: 'confirmed' | 'declined' }) => {
    await updateParticipantStatus(eventId, status);
    return status;
  }
);

export const eventDetailSlice = createSlice({
  name: 'eventDetail',
  initialState,
  reducers: {
    clearParticipants: (state) => {
      state.participants = [];
      state.currentUserId = '';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchParticipantsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchParticipantsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.participants = action.payload.participants;
        state.currentUserId = action.payload.currentUserId;
      })
      .addCase(fetchParticipantsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch participants';
      })
      .addCase(updateParticipantStatusThunk.fulfilled, (state, action) => {
        const p = state.participants.find((x) => x.user_id === state.currentUserId);
        if (p) p.status = action.payload;
      })
      .addCase(updateParticipantStatusThunk.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update status';
      });
  },
});

export const { clearParticipants } = eventDetailSlice.actions;
export default eventDetailSlice.reducer;
