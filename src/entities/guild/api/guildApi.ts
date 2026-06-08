import { baseApi } from '@/shared/api/baseApi';
import { Guild, GuildDetail, GuildMember, JoinRequest } from '../model/types';

export const guildApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGuildMembers: builder.query<GuildMember[], string>({
      query: (guildId) => `guilds/${guildId}/members`,
      providesTags: (result, _, guildId) =>
        result
          ? [
              ...result.map(({ userId }) => ({ type: 'GuildMember' as const, id: userId })),
              { type: 'GuildMember' as const, id: `LIST-${guildId}` },
            ]
          : [{ type: 'GuildMember' as const, id: `LIST-${guildId}` }],
    }),
    getGuilds: builder.query<Guild[], void>({
      query: () => 'guilds',
      providesTags: [{ type: 'Guild', id: 'LIST' }],
    }),
    createGuild: builder.mutation<Guild, { name: string; description?: string }>({
      query: (body) => ({ url: 'guilds', method: 'POST', body }),
      invalidatesTags: [{ type: 'Guild', id: 'LIST' }],
    }),
    deleteGuild: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({ url: `guilds/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Guild', id: 'LIST' }],
    }),
    updateGuild: builder.mutation<
      Guild,
      { id: string; name: string; description?: string; avatarUrl?: string }
    >({
      query: ({ id, ...body }) => ({ url: `guilds/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_, __, { id }) => [
        { type: 'Guild', id: 'LIST' },
        { type: 'Guild', id },
      ],
    }),
    addGuildMember: builder.mutation<GuildMember, { guildId: string; email: string }>({
      query: ({ guildId, email }) => ({
        url: `guilds/${guildId}/members`,
        method: 'POST',
        body: { email },
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'GuildMember' as const, id: `LIST-${guildId}` },
      ],
    }),
    removeGuildMember: builder.mutation<{ success: boolean }, { guildId: string; userId: string }>({
      query: ({ guildId, userId }) => ({
        url: `guilds/${guildId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'GuildMember' as const, id: `LIST-${guildId}` },
      ],
    }),
    leaveGuild: builder.mutation<{ success: boolean }, string>({
      query: (guildId) => ({ url: `guilds/${guildId}/leave`, method: 'POST' }),
      invalidatesTags: (_, __, guildId) => [
        { type: 'GuildMember' as const, id: `LIST-${guildId}` },
        { type: 'Guild' as const, id: guildId },
        { type: 'Guild' as const, id: 'LIST' },
      ],
    }),
    getGuildById: builder.query<GuildDetail, string>({
      query: (id) => `guilds/${id}`,
      providesTags: (_, __, id) => [{ type: 'Guild' as const, id }],
    }),
    submitJoinRequest: builder.mutation<{ id: string; status: string }, string>({
      query: (guildId) => ({ url: `guilds/${guildId}/join-requests`, method: 'POST' }),
    }),
    getJoinRequests: builder.query<JoinRequest[], string>({
      query: (guildId) => `guilds/${guildId}/join-requests`,
      providesTags: (_, __, guildId) => [
        { type: 'JoinRequest' as const, id: `LIST-${guildId}` },
      ],
    }),
    resolveJoinRequest: builder.mutation<
      { success: boolean },
      { guildId: string; requestId: string; action: 'approve' | 'decline' }
    >({
      query: ({ guildId, requestId, action }) => ({
        url: `guilds/${guildId}/join-requests/${requestId}`,
        method: 'PATCH',
        body: { action },
      }),
      invalidatesTags: (_, __, { guildId }) => [
        { type: 'JoinRequest' as const, id: `LIST-${guildId}` },
        { type: 'GuildMember' as const, id: `LIST-${guildId}` },
        { type: 'Guild' as const, id: guildId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGuildMembersQuery,
  useGetGuildsQuery,
  useCreateGuildMutation,
  useDeleteGuildMutation,
  useUpdateGuildMutation,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
  useLeaveGuildMutation,
  useGetGuildByIdQuery,
  useSubmitJoinRequestMutation,
  useGetJoinRequestsQuery,
  useResolveJoinRequestMutation,
} = guildApi;
