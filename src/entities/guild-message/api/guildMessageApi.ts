import { baseApi } from '@/shared/api/baseApi';
import type { GuildMessage } from '../model/types';

export const guildMessageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGuildMessages: builder.query<GuildMessage[], string>({
      query: (guildId) => `guilds/${guildId}/messages`,
      providesTags: (_, __, guildId) => [
        { type: 'GuildMessage' as const, id: `LIST-${guildId}` },
      ],
    }),
    addGuildMessage: builder.mutation<GuildMessage, { guildId: string; body: string }>({
      query: ({ guildId, body }) => ({
        url: `guilds/${guildId}/messages`,
        method: 'POST',
        body: { body },
      }),
      async onQueryStarted({ guildId }, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled;
          dispatch(
            guildMessageApi.util.updateQueryData('getGuildMessages', guildId, (draft) => {
              if (!draft.some((m) => m.id === created.id)) draft.push(created);
            }),
          );
        } catch {
          // GuildChat surfaces the error toast.
        }
      },
    }),
    updateGuildMessage: builder.mutation<
      GuildMessage,
      { guildId: string; messageId: string; body: string }
    >({
      query: ({ guildId, messageId, body }) => ({
        url: `guilds/${guildId}/messages/${messageId}`,
        method: 'PATCH',
        body: { body },
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'GuildMessage' as const, id: `LIST-${guildId}` },
      ],
    }),
    deleteGuildMessage: builder.mutation<
      { deleted: boolean },
      { guildId: string; messageId: string }
    >({
      query: ({ guildId, messageId }) => ({
        url: `guilds/${guildId}/messages/${messageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'GuildMessage' as const, id: `LIST-${guildId}` },
      ],
    }),
    getGuildChatReadState: builder.query<{ lastReadAt: string | null }, string>({
      query: (guildId) => `guilds/${guildId}/messages/read`,
      providesTags: (_, __, guildId) => [
        { type: 'GuildChatRead' as const, id: `LIST-${guildId}` },
      ],
    }),
    markGuildChatRead: builder.mutation<{ marked: boolean }, string>({
      query: (guildId) => ({ url: `guilds/${guildId}/messages/read`, method: 'POST' }),
      async onQueryStarted(guildId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          guildMessageApi.util.updateQueryData('getGuildChatReadState', guildId, (draft) => {
            draft.lastReadAt = new Date().toISOString();
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_, __, guildId) => [
        { type: 'GuildChatRead' as const, id: `LIST-${guildId}` },
      ],
    }),
    getGuildChatUnread: builder.query<{ hasUnread: boolean }, string>({
      query: (guildId) => `guilds/${guildId}/messages/unread`,
      providesTags: (_, __, guildId) => [
        { type: 'GuildChatRead' as const, id: `LIST-${guildId}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGuildMessagesQuery,
  useAddGuildMessageMutation,
  useUpdateGuildMessageMutation,
  useDeleteGuildMessageMutation,
  useGetGuildChatReadStateQuery,
  useMarkGuildChatReadMutation,
  useGetGuildChatUnreadQuery,
} = guildMessageApi;
