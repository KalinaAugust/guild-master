import { baseApi } from '@/shared/api/baseApi';
import { ParticipantStatus } from '@/shared/types';

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
  }),
  overrideExisting: false,
});

export const { useUpdateParticipantStatusMutation } = detailApi;
