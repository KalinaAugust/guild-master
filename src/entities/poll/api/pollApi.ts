import { baseApi } from '@/shared/api/baseApi';
import type { Poll, CreatePollInput, VoteInput } from '../model/types';
import { applyOptimisticVote } from '../model/applyVote';

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
    votePoll: builder.mutation<Poll, { guildId: string; pollId: string; vote: VoteInput }>({
      query: ({ guildId, pollId, vote }) => ({
        url: `guilds/${guildId}/polls/${pollId}/vote`,
        method: 'POST',
        body: vote,
      }),
      // Apply the vote instantly; the server response then reconciles counts and
      // voter avatars. Custom answers (no optionId) skip the optimistic step
      // because their option id is generated server-side.
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
                // Custom answer: take the authoritative poll (new option id + counts).
                draft[index] = updated;
                return;
              }
              // Existing option: trust the accumulated optimistic counts (so rapid
              // multi-select votes don't clobber each other) and only reconcile the
              // voter avatars from the server response.
              for (const option of draft[index].options) {
                const fresh = updated.options.find((o) => o.id === option.id);
                if (fresh) option.voters = fresh.voters;
              }
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
  useDeletePollMutation,
  useClosePollMutation,
  useVotePollMutation,
} = pollApi;
