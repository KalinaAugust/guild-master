import { baseApi } from '@/shared/api/baseApi';

export const aiHelperApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendTestMessage: builder.mutation<{ message: string }, { message: string }>({
      query: ({ message }) => ({
        url: 'ai-helper',
        method: 'POST',
        body: { message },
      }),
    }),
  }),
});

export const { useSendTestMessageMutation } = aiHelperApi;
