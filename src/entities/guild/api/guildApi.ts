import { baseApi } from '@/shared/api/baseApi';
import { Guild, GuildMember } from '../model/types';

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
    updateGuild: builder.mutation<Guild, { id: string; name: string; description?: string }>({
      query: ({ id, ...body }) => ({ url: `guilds/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Guild', id: 'LIST' }],
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
  }),
});

export const {
  useGetGuildMembersQuery,
  useGetGuildsQuery,
  useCreateGuildMutation,
  useDeleteGuildMutation,
  useUpdateGuildMutation,
  useAddGuildMemberMutation,
  useRemoveGuildMemberMutation,
} = guildApi;
