import { baseApi } from '@/shared/api/baseApi';
import type { DirectMessage, DmConversation, DmProfile } from '../model/types';

export interface DirectMessagesPage {
  messages: DirectMessage[];
  hasMore: boolean;
}

/** Append rows into the draft window, skipping ids already present. */
const mergeAppend = (draft: DirectMessagesPage, rows: DirectMessage[]) => {
  const known = new Set(draft.messages.map((m) => m.id));
  for (const m of rows) if (!known.has(m.id)) draft.messages.push(m);
};

export const directMessageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Main per-peer cache = the loaded message window (newest page on load,
    // grown upward by fetchOlderDirectMessages and downward by fetchNewDirectMessages).
    getDirectMessages: builder.query<DirectMessagesPage, string>({
      query: (peerId) => `dm/${peerId}/messages?limit=50`,
      providesTags: (_, __, peerId) => [
        { type: 'DirectMessage' as const, id: `LIST-${peerId}` },
      ],
    }),
    // Scroll-up history: prepends the older page into the main cache.
    fetchOlderDirectMessages: builder.query<
      DirectMessagesPage,
      { peerId: string; before: string }
    >({
      query: ({ peerId, before }) =>
        `dm/${peerId}/messages?limit=50&before=${encodeURIComponent(before)}`,
      keepUnusedDataFor: 0,
      async onQueryStarted({ peerId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(
          directMessageApi.util.updateQueryData('getDirectMessages', peerId, (draft) => {
            const known = new Set(draft.messages.map((m) => m.id));
            const fresh = data.messages.filter((m) => !known.has(m.id));
            draft.messages.unshift(...fresh);
            draft.hasMore = data.hasMore;
          }),
        );
      },
    }),
    // Realtime-triggered delta: appends messages newer than the cursor.
    fetchNewDirectMessages: builder.query<
      DirectMessagesPage,
      { peerId: string; after: string }
    >({
      query: ({ peerId, after }) =>
        `dm/${peerId}/messages?after=${encodeURIComponent(after)}`,
      keepUnusedDataFor: 0,
      async onQueryStarted({ peerId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        if (!data.messages.length) return;
        dispatch(
          directMessageApi.util.updateQueryData('getDirectMessages', peerId, (draft) => {
            mergeAppend(draft, data.messages);
          }),
        );
      },
    }),
    addDirectMessage: builder.mutation<
      DirectMessage,
      // `author` lets the message appear instantly (optimistic); the server
      // ignores it and only consumes `body` + `attachmentUrl`.
      {
        peerId: string;
        body: string;
        attachmentUrl?: string | null;
        author?: { userId: string; profile: DmProfile };
      }
    >({
      query: ({ peerId, body, attachmentUrl }) => ({
        url: `dm/${peerId}/messages`,
        method: 'POST',
        body: { body, attachmentUrl: attachmentUrl ?? null },
      }),
      async onQueryStarted({ peerId, body, attachmentUrl, author }, { dispatch, queryFulfilled }) {
        // Insert a temporary bubble immediately so sending feels instant.
        let tempId: string | null = null;
        if (author) {
          tempId = `temp-${crypto.randomUUID()}`;
          const now = new Date().toISOString();
          const optimistic: DirectMessage = {
            id: tempId,
            senderId: author.userId,
            recipientId: '',
            body,
            attachmentUrl: attachmentUrl ?? null,
            createdAt: now,
            updatedAt: now,
            senderProfile: author.profile,
          };
          dispatch(
            directMessageApi.util.updateQueryData('getDirectMessages', peerId, (draft) => {
              draft.messages.push(optimistic);
            }),
          );
        }
        try {
          const { data: created } = await queryFulfilled;
          dispatch(
            directMessageApi.util.updateQueryData('getDirectMessages', peerId, (draft) => {
              const idx = tempId ? draft.messages.findIndex((m) => m.id === tempId) : -1;
              if (idx !== -1) draft.messages[idx] = created;
              else if (!draft.messages.some((m) => m.id === created.id)) draft.messages.push(created);
            }),
          );
        } catch {
          // Roll back the optimistic bubble; DmChat surfaces the error toast.
          if (tempId) {
            dispatch(
              directMessageApi.util.updateQueryData('getDirectMessages', peerId, (draft) => {
                const idx = draft.messages.findIndex((m) => m.id === tempId);
                if (idx !== -1) draft.messages.splice(idx, 1);
              }),
            );
          }
        }
      },
      invalidatesTags: [{ type: 'DirectMessage' as const, id: 'CONVERSATIONS' }],
    }),
    updateDirectMessage: builder.mutation<
      DirectMessage,
      { peerId: string; messageId: string; body: string }
    >({
      query: ({ peerId, messageId, body }) => ({
        url: `dm/${peerId}/messages/${messageId}`,
        method: 'PATCH',
        body: { body },
      }),
      // Patch the cached window in place rather than invalidating — a refetch
      // would collapse the list back to the initial page and drop loaded history.
      async onQueryStarted({ peerId, messageId }, { dispatch, queryFulfilled }) {
        const { data: updated } = await queryFulfilled;
        dispatch(
          directMessageApi.util.updateQueryData('getDirectMessages', peerId, (draft) => {
            const idx = draft.messages.findIndex((m) => m.id === messageId);
            if (idx !== -1) draft.messages[idx] = updated;
          }),
        );
      },
    }),
    deleteDirectMessage: builder.mutation<
      { deleted: boolean },
      { peerId: string; messageId: string }
    >({
      query: ({ peerId, messageId }) => ({
        url: `dm/${peerId}/messages/${messageId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ peerId, messageId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            directMessageApi.util.updateQueryData('getDirectMessages', peerId, (draft) => {
              const idx = draft.messages.findIndex((m) => m.id === messageId);
              if (idx !== -1) draft.messages.splice(idx, 1);
            }),
          );
        } catch {
          // DmChat surfaces the error toast; cache is untouched.
        }
      },
    }),
    getConversations: builder.query<DmConversation[], void>({
      query: () => `dm/conversations`,
      providesTags: [{ type: 'DirectMessage' as const, id: 'CONVERSATIONS' }],
    }),
    getDmReadState: builder.query<{ lastReadAt: string | null }, string>({
      query: (peerId) => `dm/${peerId}/read`,
      providesTags: (_, __, peerId) => [
        { type: 'DmRead' as const, id: `LIST-${peerId}` },
      ],
    }),
    markDmRead: builder.mutation<{ marked: boolean }, string>({
      query: (peerId) => ({ url: `dm/${peerId}/read`, method: 'POST' }),
      async onQueryStarted(peerId, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          directMessageApi.util.updateQueryData('getDmReadState', peerId, (draft) => {
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
      invalidatesTags: (_, __, peerId) => [
        { type: 'DmRead' as const, id: `LIST-${peerId}` },
        { type: 'DmRead' as const, id: 'UNREAD' },
      ],
    }),
    getDmUnread: builder.query<{ hasUnread: boolean }, void>({
      query: () => `dm/unread`,
      providesTags: [{ type: 'DmRead' as const, id: 'UNREAD' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDirectMessagesQuery,
  useLazyFetchOlderDirectMessagesQuery,
  useLazyFetchNewDirectMessagesQuery,
  useAddDirectMessageMutation,
  useUpdateDirectMessageMutation,
  useDeleteDirectMessageMutation,
  useGetConversationsQuery,
  useGetDmReadStateQuery,
  useMarkDmReadMutation,
  useGetDmUnreadQuery,
} = directMessageApi;
