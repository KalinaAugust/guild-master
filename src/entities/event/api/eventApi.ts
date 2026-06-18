import { baseApi } from '@/shared/api/baseApi';
import { ActivityEvent, ActivityType, EventParticipant } from '@/shared/types';
import dayjs from '@/shared/lib/dayjs';

type RawEvent = {
  id: string;
  public_id: string;
  title: string;
  description: string | null;
  type: string;
  event_date: string;
  created_by?: string;
};

interface ParticipantsResponse {
  participants: EventParticipant[];
  currentUserId: string;
  viewerIsGuildMember: boolean;
  viewerHasPendingRequest: boolean;
}

function transformEvent(raw: RawEvent): ActivityEvent {
  const d = dayjs.utc(raw.event_date);
  return {
    id: raw.id,
    publicId: raw.public_id,
    title: raw.title,
    description: raw.description || undefined,
    type: raw.type as ActivityType,
    date: d.format('YYYY-MM-DD'),
    time: d.format('HH:mm'),
    createdBy: raw.created_by,
  };
}

export const eventApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEvents: builder.query<ActivityEvent[], string>({
      query: (guildId) => `events?guildId=${guildId}`,
      transformResponse: (raw: RawEvent[]) => raw.map(transformEvent),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Event' as const, id })),
              { type: 'Event' as const, id: 'LIST' },
            ]
          : [{ type: 'Event' as const, id: 'LIST' }],
    }),
    createEvent: builder.mutation<
      ActivityEvent,
      Omit<ActivityEvent, 'id'> & { guild_id: string }
    >({
      query: (body) => ({ url: 'events', method: 'POST', body }),
      transformResponse: (raw: RawEvent) => transformEvent(raw),
      invalidatesTags: [{ type: 'Event' as const, id: 'LIST' }],
    }),
    updateEvent: builder.mutation<
      ActivityEvent,
      { id: string; event: Partial<Omit<ActivityEvent, 'id'>> }
    >({
      query: ({ id, event }) => ({ url: `events/${id}`, method: 'PATCH', body: event }),
      transformResponse: (raw: RawEvent) => transformEvent(raw),
      invalidatesTags: (_, __, { id }) => [
        { type: 'Event' as const, id },
        { type: 'Event' as const, id: 'LIST' },
      ],
    }),
    deleteEvent: builder.mutation<{ deleted: string }, string>({
      query: (id) => ({ url: `events/${id}`, method: 'DELETE' }),
      invalidatesTags: (_, __, id) => [
        { type: 'Event' as const, id },
        { type: 'Event' as const, id: 'LIST' },
      ],
    }),
    getParticipants: builder.query<ParticipantsResponse, string>({
      query: (eventId) => `participants/${eventId}`,
      providesTags: (result, _, eventId) =>
        result
          ? [
              ...result.participants.map(({ id }) => ({ type: 'Participant' as const, id })),
              { type: 'Participant' as const, id: `LIST-${eventId}` },
            ]
          : [{ type: 'Participant' as const, id: `LIST-${eventId}` }],
    }),
    syncParticipants: builder.mutation<
      { synced: boolean },
      { eventId: string; userIds: string[] }
    >({
      query: ({ eventId, userIds }) => ({
        url: `participants/${eventId}/sync`,
        method: 'POST',
        body: { userIds },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Participant' as const, id: `LIST-${eventId}` },
      ],
    }),
    getEventById: builder.query<{ event: ActivityEvent; guildId: string }, string>({
      query: (id) => `events/${id}`,
      providesTags: (_, __, id) => [{ type: 'Event' as const, id }],
    }),
    getMyEventIds: builder.query<{ eventIds: string[] }, string>({
      query: (guildId) => `my-event-ids?guildId=${guildId}`,
      providesTags: [{ type: 'Event' as const, id: 'MY-IDS' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetEventsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  useGetParticipantsQuery,
  useSyncParticipantsMutation,
  useGetEventByIdQuery,
  useGetMyEventIdsQuery,
} = eventApi;
