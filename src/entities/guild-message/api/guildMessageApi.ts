import { baseApi } from '@/shared/api/baseApi';
import type { GuildMessage, ChatScope } from '../model/types';

export interface GuildMessagesPage {
  messages: GuildMessage[];
  hasMore: boolean;
}

/** Append rows into the draft window, skipping ids already present. */
const mergeAppend = (draft: GuildMessagesPage, rows: GuildMessage[]) => {
  const known = new Set(draft.messages.map((m) => m.id));
  for (const m of rows) if (!known.has(m.id)) draft.messages.push(m);
};

export const guildMessageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Main per-guild cache = the loaded message window (newest page on load,
    // grown upward by fetchOlderMessages and downward by fetchNewMessages).
    getGuildMessages: builder.query<GuildMessagesPage, { guildId: string; scope: ChatScope }>({
      query: ({ guildId, scope }) => `guilds/${guildId}/messages?limit=50&scope=${scope}`,
      providesTags: (_, __, { guildId, scope }) => [
        { type: 'GuildMessage' as const, id: `LIST-${guildId}-${scope}` },
      ],
    }),
    // Scroll-up history: prepends the older page into the main cache.
    fetchOlderMessages: builder.query<
      GuildMessagesPage,
      { guildId: string; scope: ChatScope; before: string }
    >({
      query: ({ guildId, scope, before }) =>
        `guilds/${guildId}/messages?limit=50&before=${encodeURIComponent(before)}&scope=${scope}`,
      keepUnusedDataFor: 0,
      async onQueryStarted({ guildId, scope }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(
          guildMessageApi.util.updateQueryData('getGuildMessages', { guildId, scope }, (draft) => {
            const known = new Set(draft.messages.map((m) => m.id));
            const fresh = data.messages.filter((m) => !known.has(m.id));
            draft.messages.unshift(...fresh);
            draft.hasMore = data.hasMore;
          }),
        );
      },
    }),
    // Realtime-triggered delta: appends messages newer than the cursor.
    fetchNewMessages: builder.query<
      GuildMessagesPage,
      { guildId: string; scope: ChatScope; after: string }
    >({
      query: ({ guildId, scope, after }) =>
        `guilds/${guildId}/messages?after=${encodeURIComponent(after)}&scope=${scope}`,
      keepUnusedDataFor: 0,
      async onQueryStarted({ guildId, scope }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        if (!data.messages.length) return;
        dispatch(
          guildMessageApi.util.updateQueryData('getGuildMessages', { guildId, scope }, (draft) => {
            mergeAppend(draft, data.messages);
          }),
        );
      },
    }),
    addGuildMessage: builder.mutation<
      GuildMessage,
      // `author` lets the message appear instantly (optimistic); the server
      // ignores it and only consumes `body` + `attachmentUrl`.
      {
        guildId: string;
        scope: ChatScope;
        body: string;
        attachmentUrl?: string | null;
        author?: { userId: string; profile: GuildMessage['profile'] };
      }
    >({
      query: ({ guildId, scope, body, attachmentUrl }) => ({
        url: `guilds/${guildId}/messages`,
        method: 'POST',
        body: { body, attachmentUrl: attachmentUrl ?? null, scope },
      }),
      async onQueryStarted({ guildId, scope, body, attachmentUrl, author }, { dispatch, queryFulfilled }) {
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
            guildMessageApi.util.updateQueryData('getGuildMessages', { guildId, scope }, (draft) => {
              draft.messages.push(optimistic);
            }),
          );
        }
        try {
          const { data: created } = await queryFulfilled;
          dispatch(
            guildMessageApi.util.updateQueryData('getGuildMessages', { guildId, scope }, (draft) => {
              const idx = tempId ? draft.messages.findIndex((m) => m.id === tempId) : -1;
              if (idx !== -1) draft.messages[idx] = created;
              else if (!draft.messages.some((m) => m.id === created.id)) draft.messages.push(created);
            }),
          );
        } catch {
          // Roll back the optimistic bubble; GuildChat surfaces the error toast.
          if (tempId) {
            dispatch(
              guildMessageApi.util.updateQueryData('getGuildMessages', { guildId, scope }, (draft) => {
                const idx = draft.messages.findIndex((m) => m.id === tempId);
                if (idx !== -1) draft.messages.splice(idx, 1);
              }),
            );
          }
        }
      },
    }),
    updateGuildMessage: builder.mutation<
      GuildMessage,
      { guildId: string; scope: ChatScope; messageId: string; body: string }
    >({
      query: ({ guildId, messageId, body }) => ({
        url: `guilds/${guildId}/messages/${messageId}`,
        method: 'PATCH',
        body: { body },
      }),
      // Patch the cached window in place rather than invalidating — a refetch
      // would collapse the list back to the initial page and drop loaded history.
      async onQueryStarted({ guildId, scope, messageId }, { dispatch, queryFulfilled }) {
        const { data: updated } = await queryFulfilled;
        dispatch(
          guildMessageApi.util.updateQueryData('getGuildMessages', { guildId, scope }, (draft) => {
            const idx = draft.messages.findIndex((m) => m.id === messageId);
            if (idx !== -1) draft.messages[idx] = updated;
          }),
        );
      },
    }),
    deleteGuildMessage: builder.mutation<
      { deleted: boolean },
      { guildId: string; scope: ChatScope; messageId: string }
    >({
      query: ({ guildId, messageId }) => ({
        url: `guilds/${guildId}/messages/${messageId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ guildId, scope, messageId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            guildMessageApi.util.updateQueryData('getGuildMessages', { guildId, scope }, (draft) => {
              const idx = draft.messages.findIndex((m) => m.id === messageId);
              if (idx !== -1) draft.messages.splice(idx, 1);
            }),
          );
        } catch {
          // GuildChat surfaces the error toast; cache is untouched.
        }
      },
    }),
    getGuildChatReadState: builder.query<{ lastReadAt: string | null }, { guildId: string; scope: ChatScope }>({
      query: ({ guildId, scope }) => `guilds/${guildId}/messages/read?scope=${scope}`,
      providesTags: (_, __, { guildId, scope }) => [
        { type: 'GuildChatRead' as const, id: `LIST-${guildId}-${scope}` },
      ],
    }),
    markGuildChatRead: builder.mutation<{ marked: boolean }, { guildId: string; scope: ChatScope }>({
      query: ({ guildId, scope }) => ({ url: `guilds/${guildId}/messages/read?scope=${scope}`, method: 'POST' }),
      async onQueryStarted({ guildId, scope }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          guildMessageApi.util.updateQueryData('getGuildChatReadState', { guildId, scope }, (draft) => {
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
      invalidatesTags: (_, __, { guildId, scope }) => [
        { type: 'GuildChatRead' as const, id: `LIST-${guildId}-${scope}` },
      ],
    }),
    getGuildChatUnread: builder.query<{ hasUnread: boolean }, { guildId: string; scope: ChatScope }>({
      query: ({ guildId, scope }) => `guilds/${guildId}/messages/unread?scope=${scope}`,
      providesTags: (_, __, { guildId, scope }) => [
        { type: 'GuildChatRead' as const, id: `LIST-${guildId}-${scope}` },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGuildMessagesQuery,
  useLazyFetchOlderMessagesQuery,
  useLazyFetchNewMessagesQuery,
  useAddGuildMessageMutation,
  useUpdateGuildMessageMutation,
  useDeleteGuildMessageMutation,
  useGetGuildChatReadStateQuery,
  useMarkGuildChatReadMutation,
  useGetGuildChatUnreadQuery,
} = guildMessageApi;
