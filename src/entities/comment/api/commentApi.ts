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
      invalidatesTags: (_, __, { eventId }) => [
        { type: 'Comment' as const, id: `LIST-${eventId}` },
      ],
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
      invalidatesTags: (_, __, eventId) => [
        { type: 'CommentRead' as const, id: `LIST-${eventId}` },
        { type: 'Notification' as const, id: 'LIST' },
      ],
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
