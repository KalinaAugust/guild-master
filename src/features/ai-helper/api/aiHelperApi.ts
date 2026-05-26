import { baseApi } from '@/shared/api/baseApi';

export const aiHelperApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendTestMessage: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: 'ai-helper',
        method: 'POST',
      }),
    }),
  }),
});

export const { useSendTestMessageMutation } = aiHelperApi;
