import { baseApi } from '@/shared/api/baseApi';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SendAiMessageResponse {
  message: string;
  eventCreated: boolean;
  eventUpdated: boolean;
}

interface SendAiMessageRequest {
  messages: ChatMessage[];
  guildId: string;
}

export const aiHelperApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendAiMessage: builder.mutation<SendAiMessageResponse, SendAiMessageRequest>({
      query: ({ messages, guildId }) => ({
        url: 'ai-helper',
        method: 'POST',
        body: { messages, guildId },
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useSendAiMessageMutation } = aiHelperApi;
