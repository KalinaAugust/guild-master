import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Event', 'Participant', 'GuildMember', 'Guild', 'Notification', 'JoinRequest', 'EventJoinRequest', 'Comment', 'CommentRead', 'GuildMessage', 'GuildChatRead'],
  endpoints: () => ({}),
});
