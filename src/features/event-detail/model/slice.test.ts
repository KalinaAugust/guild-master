import { describe, it, expect, vi } from 'vitest';
import reducer, {
  clearParticipants,
  fetchParticipantsThunk,
  updateParticipantStatusThunk,
} from './slice';
import { EventParticipant } from '@/shared/types';

vi.mock('../api/getEventParticipants', () => ({
  getEventParticipants: vi.fn(),
}));
vi.mock('../api/updateParticipantStatus', () => ({
  updateParticipantStatus: vi.fn(),
}));

const initialState = {
  participants: [],
  currentUserId: '',
  loading: false,
  error: null,
};

const mockParticipant: EventParticipant = {
  id: 'p1',
  event_id: 'e1',
  user_id: 'u1',
  status: 'pending',
  profile: { fullName: 'Alice', avatarUrl: null },
};

describe('eventDetailSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('clearParticipants resets state', () => {
    const state = { ...initialState, participants: [mockParticipant], currentUserId: 'u99' };
    const actual = reducer(state, clearParticipants());
    expect(actual.participants).toEqual([]);
    expect(actual.currentUserId).toBe('');
  });

  it('fetchParticipantsThunk.fulfilled sets participants and currentUserId', () => {
    const action = fetchParticipantsThunk.fulfilled(
      { participants: [mockParticipant], currentUserId: 'u1' },
      '',
      'e1'
    );
    const actual = reducer(initialState, action);
    expect(actual.participants).toEqual([mockParticipant]);
    expect(actual.currentUserId).toBe('u1');
    expect(actual.loading).toBe(false);
  });

  it('fetchParticipantsThunk.pending sets loading', () => {
    const action = fetchParticipantsThunk.pending('', 'e1');
    const actual = reducer(initialState, action);
    expect(actual.loading).toBe(true);
  });

  it('fetchParticipantsThunk.rejected sets error', () => {
    const action = fetchParticipantsThunk.rejected(new Error('fail'), '', 'e1');
    const actual = reducer(initialState, action);
    expect(actual.loading).toBe(false);
    expect(actual.error).toBe('fail');
  });

  it('updateParticipantStatusThunk.fulfilled updates status of current user participant', () => {
    const state = {
      ...initialState,
      participants: [mockParticipant],
      currentUserId: 'u1',
    };
    const action = updateParticipantStatusThunk.fulfilled(
      'confirmed',
      '',
      { eventId: 'e1', status: 'confirmed' }
    );
    const actual = reducer(state, action);
    expect(actual.participants[0].status).toBe('confirmed');
  });

  it('updateParticipantStatusThunk.rejected sets error', () => {
    const action = updateParticipantStatusThunk.rejected(new Error('update failed'), '', { eventId: 'e1', status: 'confirmed' });
    const actual = reducer(initialState, action);
    expect(actual.error).toBe('update failed');
  });
});
