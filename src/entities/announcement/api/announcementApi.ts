import { baseApi } from '@/shared/api/baseApi';
import type {
  Announcement,
  AnnouncementComment,
  CreateAnnouncementInput,
  GuildAnnouncementsResult,
  ReactionType,
  UpdateAnnouncementInput,
} from '../model/types';
import { applyOptimisticReaction } from '../model/reactions';

const listTag = (guildId: string) => [{ type: 'Announcement' as const, id: `LIST-${guildId}` }];
const commentsTag = (announcementId: string) => [
  { type: 'AnnouncementComment' as const, id: `LIST-${announcementId}` },
];

/** Replaces a single announcement in the cached guild list with `updated`. */
const replaceInList = (guildId: string, updated: Announcement) =>
  announcementApi.util.updateQueryData('getGuildAnnouncements', guildId, (draft) => {
    const idx = draft.announcements.findIndex((a) => a.id === updated.id);
    if (idx !== -1) draft.announcements[idx] = updated;
  });

export const announcementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGuildAnnouncements: builder.query<GuildAnnouncementsResult, string>({
      query: (guildId) => `guilds/${guildId}/announcements`,
      providesTags: (_, __, guildId) => listTag(guildId),
    }),

    createAnnouncement: builder.mutation<Announcement, { guildId: string; input: CreateAnnouncementInput }>({
      query: ({ guildId, input }) => ({
        url: `guilds/${guildId}/announcements`,
        method: 'POST',
        body: input,
      }),
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),

    updateAnnouncement: builder.mutation<
      Announcement,
      { guildId: string; announcementId: string; input: UpdateAnnouncementInput }
    >({
      query: ({ guildId, announcementId, input }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}`,
        method: 'PATCH',
        body: input,
      }),
      async onQueryStarted({ guildId }, { dispatch, queryFulfilled }) {
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(replaceInList(guildId, updated));
        } catch {
          /* surfaced via toast in the card */
        }
      },
    }),

    setAnnouncementPinned: builder.mutation<
      Announcement,
      { guildId: string; announcementId: string; isPinned: boolean }
    >({
      query: ({ guildId, announcementId, isPinned }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}`,
        method: 'PATCH',
        body: { isPinned },
      }),
      invalidatesTags: (_, __, { guildId }) => listTag(guildId),
    }),

    deleteAnnouncement: builder.mutation<{ deleted: boolean }, { guildId: string; announcementId: string }>({
      query: ({ guildId, announcementId }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ guildId, announcementId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          announcementApi.util.updateQueryData('getGuildAnnouncements', guildId, (draft) => {
            const idx = draft.announcements.findIndex((a) => a.id === announcementId);
            if (idx !== -1) draft.announcements.splice(idx, 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    toggleReaction: builder.mutation<
      Announcement,
      { guildId: string; announcementId: string; type: ReactionType }
    >({
      query: ({ guildId, announcementId, type }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}/reactions`,
        method: 'POST',
        body: { type },
      }),
      async onQueryStarted({ guildId, announcementId, type }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          announcementApi.util.updateQueryData('getGuildAnnouncements', guildId, (draft) => {
            const a = draft.announcements.find((x) => x.id === announcementId);
            if (a) applyOptimisticReaction(a, type);
          }),
        );
        try {
          const { data: updated } = await queryFulfilled;
          dispatch(replaceInList(guildId, updated));
        } catch {
          patch.undo();
        }
      },
    }),

    getAnnouncementComments: builder.query<AnnouncementComment[], { guildId: string; announcementId: string }>({
      query: ({ guildId, announcementId }) => `guilds/${guildId}/announcements/${announcementId}/comments`,
      providesTags: (_, __, { announcementId }) => commentsTag(announcementId),
    }),

    addAnnouncementComment: builder.mutation<
      AnnouncementComment,
      {
        guildId: string;
        announcementId: string;
        body: string;
        author?: { userId: string; profile: AnnouncementComment['profile'] };
      }
    >({
      query: ({ guildId, announcementId, body }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}/comments`,
        method: 'POST',
        body: { body },
      }),
      async onQueryStarted({ guildId, announcementId, body, author }, { dispatch, queryFulfilled }) {
        let tempId: string | null = null;
        if (author) {
          tempId = `temp-${crypto.randomUUID()}`;
          const now = new Date().toISOString();
          const optimistic: AnnouncementComment = {
            id: tempId,
            announcementId,
            userId: author.userId,
            body,
            createdAt: now,
            canDelete: true,
            profile: author.profile,
          };
          dispatch(
            announcementApi.util.updateQueryData(
              'getAnnouncementComments',
              { guildId, announcementId },
              (draft) => { draft.push(optimistic); },
            ),
          );
        }
        // Bump the card's comment counter immediately.
        const countPatch = dispatch(
          announcementApi.util.updateQueryData('getGuildAnnouncements', guildId, (draft) => {
            const a = draft.announcements.find((x) => x.id === announcementId);
            if (a) a.commentCount += 1;
          }),
        );
        try {
          const { data: created } = await queryFulfilled;
          dispatch(
            announcementApi.util.updateQueryData(
              'getAnnouncementComments',
              { guildId, announcementId },
              (draft) => {
                const idx = tempId ? draft.findIndex((c) => c.id === tempId) : -1;
                if (idx !== -1) draft[idx] = created;
                else if (!draft.some((c) => c.id === created.id)) draft.push(created);
              },
            ),
          );
        } catch {
          countPatch.undo();
          if (tempId) {
            dispatch(
              announcementApi.util.updateQueryData(
                'getAnnouncementComments',
                { guildId, announcementId },
                (draft) => {
                  const idx = draft.findIndex((c) => c.id === tempId);
                  if (idx !== -1) draft.splice(idx, 1);
                },
              ),
            );
          }
        }
      },
    }),

    deleteAnnouncementComment: builder.mutation<
      { deleted: boolean },
      { guildId: string; announcementId: string; commentId: string }
    >({
      query: ({ guildId, announcementId, commentId }) => ({
        url: `guilds/${guildId}/announcements/${announcementId}/comments/${commentId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ guildId, announcementId, commentId }, { dispatch, queryFulfilled }) {
        const listPatch = dispatch(
          announcementApi.util.updateQueryData(
            'getAnnouncementComments',
            { guildId, announcementId },
            (draft) => {
              const idx = draft.findIndex((c) => c.id === commentId);
              if (idx !== -1) draft.splice(idx, 1);
            },
          ),
        );
        const countPatch = dispatch(
          announcementApi.util.updateQueryData('getGuildAnnouncements', guildId, (draft) => {
            const a = draft.announcements.find((x) => x.id === announcementId);
            if (a) a.commentCount = Math.max(0, a.commentCount - 1);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          listPatch.undo();
          countPatch.undo();
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGuildAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useSetAnnouncementPinnedMutation,
  useDeleteAnnouncementMutation,
  useToggleReactionMutation,
  useGetAnnouncementCommentsQuery,
  useAddAnnouncementCommentMutation,
  useDeleteAnnouncementCommentMutation,
} = announcementApi;
