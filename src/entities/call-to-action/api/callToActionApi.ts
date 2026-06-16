import { baseApi } from '@/shared/api/baseApi';
import type {
  CallToAction,
  CallToActionsResult,
  CreateCallToActionInput,
} from '../model/types';

const listTag = (guildId: string) => [{ type: 'CallToAction' as const, id: `LIST-${guildId}` }];

/** Replaces a single CTA in the cached guild list with `updated`. */
const replaceInList = (guildId: string, updated: CallToAction) =>
  callToActionApi.util.updateQueryData('getCallToActions', guildId, (draft) => {
    const idx = draft.callToActions.findIndex((c) => c.id === updated.id);
    if (idx !== -1) draft.callToActions[idx] = updated;
  });

export const callToActionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCallToActions: builder.query<CallToActionsResult, string>({
      query: (guildId) => `guilds/${guildId}/call-to-actions`,
      providesTags: (_, __, guildId) => listTag(guildId),
    }),

    createCallToAction: builder.mutation<CallToAction, { guildId: string; input: CreateCallToActionInput }>({
      query: ({ guildId, input }) => ({
        url: `guilds/${guildId}/call-to-actions`,
        method: 'POST',
        body: input,
      }),
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),

    toggleCallToActionInterest: builder.mutation<CallToAction, { guildId: string; ctaId: string }>({
      query: ({ guildId, ctaId }) => ({
        url: `guilds/${guildId}/call-to-actions/${ctaId}/interest`,
        method: 'POST',
      }),
      // A launch may create a calendar event → refresh events too.
      invalidatesTags: () => ['Event'],
      async onQueryStarted({ guildId }, { dispatch, queryFulfilled }) {
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(replaceInList(guildId, updated));
        } catch {
          /* surfaced via toast in the board */
        }
      },
    }),

    deleteCallToAction: builder.mutation<{ deleted: boolean }, { guildId: string; ctaId: string }>({
      query: ({ guildId, ctaId }) => ({
        url: `guilds/${guildId}/call-to-actions/${ctaId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ guildId, ctaId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          callToActionApi.util.updateQueryData('getCallToActions', guildId, (draft) => {
            const idx = draft.callToActions.findIndex((c) => c.id === ctaId);
            if (idx !== -1) draft.callToActions.splice(idx, 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCallToActionsQuery,
  useCreateCallToActionMutation,
  useToggleCallToActionInterestMutation,
  useDeleteCallToActionMutation,
} = callToActionApi;
