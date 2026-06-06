import { baseApi } from '@/shared/api/baseApi';
import type { EventComment } from '../model/types';

export const commentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getComments: builder.query<EventComment[], string>({
      query: (eventId) => `events/${eventId}/comments`,
      providesTags: (_, __, eventId) => [
        { type: 'Comment' as const, id: `LIST-${eventId}` },
      ],
    }),
    addComment: builder.mutation<EventComment, { eventId: string; body: string }>({
      query: ({ eventId, body }) => ({
        url: `events/${eventId}/comments`,
        method: 'POST',
        body: { body },
      }),
      // Append the created comment to the cached list instead of invalidating
      // (which would refetch the whole thread and remount every avatar image).
      async onQueryStarted({ eventId }, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled;
          dispatch(
            commentApi.util.updateQueryData('getComments', eventId, (draft) => {
              if (!draft.some((c) => c.id === created.id)) {
                draft.push(created);
              }
            })
          );
        } catch {
          // Mutation failed; CommentsTab surfaces the error toast.
        }
      },
    }),
    updateComment: builder.mutation<
      EventComment,
      { eventId: string; commentId: string; body: string }
    >({
      query: ({ eventId, commentId, body }) => ({
        url: `events/${eventId}/comments/${commentId}`,
        method: 'PATCH',
        body: { body },
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Comment' as const, id: `LIST-${eventId}` },
      ],
    }),
    deleteComment: builder.mutation<
      { deleted: boolean },
      { eventId: string; commentId: string }
    >({
      query: ({ eventId, commentId }) => ({
        url: `events/${eventId}/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Comment' as const, id: `LIST-${eventId}` },
      ],
    }),
    getCommentReadState: builder.query<{ lastReadAt: string | null }, string>({
      query: (eventId) => `events/${eventId}/comments/read`,
      providesTags: (_, __, eventId) => [
        { type: 'CommentRead' as const, id: `LIST-${eventId}` },
      ],
    }),
    markCommentsRead: builder.mutation<{ marked: boolean }, string>({
      query: (eventId) => ({ url: `events/${eventId}/comments/read`, method: 'POST' }),
      // Write the new read timestamp straight into the cache instead of
      // invalidating it — the server value matches `now`, so refetching the
      // read state we just set is wasted. The bell still refetches via the
      // Notification tag, since clearing unread notifications needs fresh data.
      async onQueryStarted(eventId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          commentApi.util.updateQueryData('getCommentReadState', eventId, (draft) => {
            draft.lastReadAt = new Date().toISOString();
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: () => [{ type: 'Notification' as const, id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetCommentsQuery,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useGetCommentReadStateQuery,
  useMarkCommentsReadMutation,
} = commentApi;
