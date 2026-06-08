import { baseApi } from '@/shared/api/baseApi';
import type { Poll, CreatePollInput, VoteInput } from '../model/types';

const listTag = (guildId: string) => [{ type: 'Poll' as const, id: `LIST-${guildId}` }];

export const pollApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGuildPolls: builder.query<Poll[], string>({
      query: (guildId) => `guilds/${guildId}/polls`,
      providesTags: (_, __, guildId) => listTag(guildId),
    }),
    createPoll: builder.mutation<Poll, { guildId: string; input: CreatePollInput }>({
      query: ({ guildId, input }) => ({
        url: `guilds/${guildId}/polls`,
        method: 'POST',
        body: input,
      }),
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),
    deletePoll: builder.mutation<{ deleted: boolean }, { guildId: string; pollId: string }>({
      query: ({ guildId, pollId }) => ({
        url: `guilds/${guildId}/polls/${pollId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),
    closePoll: builder.mutation<Poll, { guildId: string; pollId: string }>({
      query: ({ guildId, pollId }) => ({
        url: `guilds/${guildId}/polls/${pollId}`,
        method: 'PATCH',
      }),
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),
    votePoll: builder.mutation<Poll, { guildId: string; pollId: string; vote: VoteInput }>({
      query: ({ guildId, pollId, vote }) => ({
        url: `guilds/${guildId}/polls/${pollId}/vote`,
        method: 'POST',
        body: vote,
      }),
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),
  }),
});

export const {
  useGetGuildPollsQuery,
  useCreatePollMutation,
  useDeletePollMutation,
  useClosePollMutation,
  useVotePollMutation,
} = pollApi;
