import { baseApi } from '@/shared/api/baseApi';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const aiHelperApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendTestMessage: builder.mutation<{ message: string }, { messages: ChatMessage[] }>({
      query: ({ messages }) => ({
        url: 'ai-helper',
        method: 'POST',
        body: { messages },
      }),
    }),
  }),
});

export const { useSendTestMessageMutation } = aiHelperApi;
