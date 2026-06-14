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
    addComment: builder.mutation<
      EventComment,
      // `author` lets the comment appear instantly (optimistic); the server
      // ignores it and only consumes `body`.
      { eventId: string; body: string; author?: { userId: string; profile: EventComment['profile'] } }
    >({
      query: ({ eventId, body }) => ({
        url: `events/${eventId}/comments`,
        method: 'POST',
        body: { body },
      }),
      // Append the created comment to the cached list instead of invalidating
      // (which would refetch the whole thread and remount every avatar image).
      async onQueryStarted({ eventId, body, author }, { dispatch, queryFulfilled }) {
        // Insert a temporary comment immediately so sending feels instant.
        let tempId: string | null = null;
        if (author) {
          tempId = `temp-${crypto.randomUUID()}`;
          const now = new Date().toISOString();
          const optimistic: EventComment = {
            id: tempId,
            eventId,
            userId: author.userId,
            body,
            createdAt: now,
            updatedAt: now,
            profile: author.profile,
          };
          dispatch(
            commentApi.util.updateQueryData('getComments', eventId, (draft) => {
              draft.push(optimistic);
            })
          );
        }
        try {
          const { data: created } = await queryFulfilled;
          dispatch(
            commentApi.util.updateQueryData('getComments', eventId, (draft) => {
              const idx = tempId ? draft.findIndex((c) => c.id === tempId) : -1;
              if (idx !== -1) draft[idx] = created;
              else if (!draft.some((c) => c.id === created.id)) draft.push(created);
            })
          );
        } catch {
          // Roll back the optimistic comment; CommentsTab surfaces the error toast.
          if (tempId) {
            dispatch(
              commentApi.util.updateQueryData('getComments', eventId, (draft) => {
                const idx = draft.findIndex((c) => c.id === tempId);
                if (idx !== -1) draft.splice(idx, 1);
              })
            );
          }
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
