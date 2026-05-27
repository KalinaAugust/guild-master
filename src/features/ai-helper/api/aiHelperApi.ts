import { baseApi } from '@/shared/api/baseApi';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const aiHelperApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendAiMessage: builder.mutation<
      { message: string; eventCreated: boolean; eventUpdated: boolean },
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

export const { useSendAiMessageMutation } = aiHelperApi;
