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
    addGuildMessage: builder.mutation<
      GuildMessage,
      // `author` lets the message appear instantly (optimistic); the server
      // ignores it and only consumes `body` + `attachmentUrl`.
      {
        guildId: string;
        body: string;
        attachmentUrl?: string | null;
        author?: { userId: string; profile: GuildMessage['profile'] };
      }
    >({
      query: ({ guildId, body, attachmentUrl }) => ({
        url: `guilds/${guildId}/messages`,
        method: 'POST',
        body: { body, attachmentUrl: attachmentUrl ?? null },
      }),
      async onQueryStarted({ guildId, body, attachmentUrl, author }, { dispatch, queryFulfilled }) {
        // Insert a temporary bubble immediately so sending feels instant.
        let tempId: string | null = null;
        if (author) {
          tempId = `temp-${crypto.randomUUID()}`;
          const now = new Date().toISOString();
          const optimistic: GuildMessage = {
            id: tempId,
            guildId,
            userId: author.userId,
            body,
            attachmentUrl: attachmentUrl ?? null,
            createdAt: now,
            updatedAt: now,
            profile: author.profile,
          };
          dispatch(
            guildMessageApi.util.updateQueryData('getGuildMessages', guildId, (draft) => {
              draft.push(optimistic);
            }),
          );
        }
        try {
          const { data: created } = await queryFulfilled;
          dispatch(
            guildMessageApi.util.updateQueryData('getGuildMessages', guildId, (draft) => {
              const idx = tempId ? draft.findIndex((m) => m.id === tempId) : -1;
              if (idx !== -1) draft[idx] = created;
              else if (!draft.some((m) => m.id === created.id)) draft.push(created);
            }),
          );
        } catch {
          // Roll back the optimistic bubble; GuildChat surfaces the error toast.
          if (tempId) {
            dispatch(
              guildMessageApi.util.updateQueryData('getGuildMessages', guildId, (draft) => {
                const idx = draft.findIndex((m) => m.id === tempId);
                if (idx !== -1) draft.splice(idx, 1);
              }),
            );
          }
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
            if (draft) {
              draft.lastReadAt = new Date().toISOString();
            }
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
