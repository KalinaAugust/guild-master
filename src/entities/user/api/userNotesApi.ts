import { baseApi } from '@/shared/api/baseApi';

export interface UserNote {
  target_user_id: string;
  note: string;
  target_public_id: string | null;
}

export const userNotesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserNotes: builder.query<UserNote[], void>({
      query: () => ({
        url: 'user-notes',
        method: 'GET',
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ target_user_id }) => ({ type: 'UserNote' as const, id: target_user_id })),
              { type: 'UserNote' as const, id: 'LIST' },
            ]
          : [{ type: 'UserNote' as const, id: 'LIST' }],
    }),
    updateUserNote: builder.mutation<{ success: boolean }, { targetUserId: string; note: string }>({
      query: ({ targetUserId, note }) => ({
        url: `user-notes/${targetUserId}`,
        method: 'PATCH',
        body: { note },
      }),
      invalidatesTags: (_, __, { targetUserId }) => [
        { type: 'UserNote' as const, id: targetUserId },
        { type: 'UserNote' as const, id: 'LIST' },
      ],
    }),
    deleteUserNote: builder.mutation<{ success: boolean }, string>({
      query: (targetUserId) => ({
        url: `user-notes/${targetUserId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, targetUserId) => [
        { type: 'UserNote' as const, id: targetUserId },
        { type: 'UserNote' as const, id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetUserNotesQuery,
  useUpdateUserNoteMutation,
  useDeleteUserNoteMutation,
} = userNotesApi;
