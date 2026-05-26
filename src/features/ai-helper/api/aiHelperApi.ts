import { baseApi } from '@/shared/api/baseApi';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const aiHelperApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendTestMessage: builder.mutation<
      { message: string; eventCreated: boolean },
      { messages: ChatMessage[]; guildId: string }
    >({
      query: ({ messages, guildId }) => ({
        url: 'ai-helper',
        method: 'POST',
        body: { messages, guildId },
      }),
    }),
  }),
});

export const { useSendTestMessageMutation } = aiHelperApi;
