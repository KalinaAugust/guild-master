import { baseApi } from '@/shared/api/baseApi';
import type { Poll, CreatePollInput, VoteInput } from '../model/types';
import { applyOptimisticVote, applyOptimisticVotes } from '../model/applyVote';

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
      // Optimistically drop the poll from the list; restore it on failure.
      async onQueryStarted({ guildId, pollId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          pollApi.util.updateQueryData('getGuildPolls', guildId, (draft) => {
            const index = draft.findIndex((p) => p.id === pollId);
            if (index !== -1) draft.splice(index, 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
    closePoll: builder.mutation<Poll, { guildId: string; pollId: string }>({
      query: ({ guildId, pollId }) => ({
        url: `guilds/${guildId}/polls/${pollId}`,
        method: 'PATCH',
      }),
      // Optimistically mark the poll closed; reconcile with the server response.
      async onQueryStarted({ guildId, pollId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          pollApi.util.updateQueryData('getGuildPolls', guildId, (draft) => {
            const poll = draft.find((p) => p.id === pollId);
            if (poll) poll.closedAt = new Date().toISOString();
          }),
        );
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(
            pollApi.util.updateQueryData('getGuildPolls', guildId, (draft) => {
              const index = draft.findIndex((p) => p.id === pollId);
              if (index !== -1) draft[index] = updated;
            }),
          );
        } catch {
          patch.undo();
        }
      },
    }),
    addPollOption: builder.mutation<
      { poll: Poll; optionId: string },
      { guildId: string; pollId: string; body: string }
    >({
      query: ({ guildId, pollId, body }) => ({
        url: `guilds/${guildId}/polls/${pollId}/options`,
        method: 'POST',
        body: { body },
      }),
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),
    setPollVotes: builder.mutation<Poll, { guildId: string; pollId: string; optionIds: string[] }>({
      query: ({ guildId, pollId, optionIds }) => ({
        url: `guilds/${guildId}/polls/${pollId}/vote`,
        method: 'PUT',
        body: { optionIds },
      }),
      // Apply the whole selection at once; reconcile with the server response.
      async onQueryStarted({ guildId, pollId, optionIds }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          pollApi.util.updateQueryData('getGuildPolls', guildId, (draft) => {
            const poll = draft.find((p) => p.id === pollId);
            if (poll) applyOptimisticVotes(poll, optionIds);
          }),
        );
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(
            pollApi.util.updateQueryData('getGuildPolls', guildId, (draft) => {
              const index = draft.findIndex((p) => p.id === pollId);
              if (index !== -1) draft[index] = updated;
            }),
          );
        } catch {
          patch.undo();
        }
      },
    }),
    votePoll: builder.mutation<Poll, { guildId: string; pollId: string; vote: VoteInput }>({
      query: ({ guildId, pollId, vote }) => ({
        url: `guilds/${guildId}/polls/${pollId}/vote`,
        method: 'POST',
        body: vote,
      }),
      // Apply the vote instantly; the server response then reconciles the voter
      // lists (counts are already covered by the optimistic patch). Custom answers
      // (no optionId) skip the optimistic step because their option id is server-generated.
      async onQueryStarted({ guildId, pollId, vote }, { dispatch, queryFulfilled }) {
        const patch = vote.optionId
          ? dispatch(
              pollApi.util.updateQueryData('getGuildPolls', guildId, (draft) => {
                const poll = draft.find((p) => p.id === pollId);
                if (poll) applyOptimisticVote(poll, vote.optionId!);
              }),
            )
          : undefined;
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(
            pollApi.util.updateQueryData('getGuildPolls', guildId, (draft) => {
              const index = draft.findIndex((p) => p.id === pollId);
              if (index === -1) return;
              if (!vote.optionId) {
                // Custom answer: the server created the option, so replace wholesale.
                draft[index] = updated;
                return;
              }
              // Pull the authoritative voter lists in without disturbing the
              // optimistic counts (avoids flicker when votes overlap).
              updated.options.forEach((serverOption) => {
                const option = draft[index].options.find((o) => o.id === serverOption.id);
                if (option) option.voters = serverOption.voters;
              });
            }),
          );
        } catch {
          patch?.undo();
        }
      },
    }),
  }),
});

export const {
  useGetGuildPollsQuery,
  useCreatePollMutation,
  useAddPollOptionMutation,
  useDeletePollMutation,
  useClosePollMutation,
  useVotePollMutation,
  useSetPollVotesMutation,
} = pollApi;
