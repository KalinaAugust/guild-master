import { baseApi } from '@/shared/api/baseApi';
import { ParticipantStatus } from '@/shared/types';

export interface EventJoinRequest {
  id: string;
  userId: string;
  userName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export const detailApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateParticipantStatus: builder.mutation<
      { updated: boolean },
      { eventId: string; status: ParticipantStatus }
    >({
      query: ({ eventId, status }) => ({
        url: `participants/${eventId}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Participant' as const, id: `LIST-${eventId}` },
      ],
    }),
    addSelfAsParticipant: builder.mutation<{ added: boolean }, string>({
      query: (eventId) => ({ url: `participants/${eventId}`, method: 'POST' }),
      invalidatesTags: (_, __, eventId) => [
        { type: 'Participant' as const, id: `LIST-${eventId}` },
      ],
    }),
    submitEventJoinRequest: builder.mutation<{ id: string }, string>({
      query: (eventId) => ({ url: `events/${eventId}/join-requests`, method: 'POST' }),
      invalidatesTags: (_, __, eventId) => [
        { type: 'Participant' as const, id: `LIST-${eventId}` },
      ],
    }),
    getEventJoinRequests: builder.query<EventJoinRequest[], string>({
      query: (eventId) => `events/${eventId}/join-requests`,
      providesTags: (_, __, eventId) => [
        { type: 'EventJoinRequest' as const, id: `LIST-${eventId}` },
      ],
    }),
    resolveEventJoinRequest: builder.mutation<
      { success: boolean },
      { eventId: string; requestId: string; action: 'approve' | 'decline' }
    >({
      query: ({ eventId, requestId, action }) => ({
        url: `events/${eventId}/join-requests/${requestId}`,
        method: 'PATCH',
        body: { action },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'EventJoinRequest' as const, id: `LIST-${eventId}` },
        { type: 'Participant' as const, id: `LIST-${eventId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useUpdateParticipantStatusMutation,
  useAddSelfAsParticipantMutation,
  useSubmitEventJoinRequestMutation,
  useGetEventJoinRequestsQuery,
  useResolveEventJoinRequestMutation,
} = detailApi;
