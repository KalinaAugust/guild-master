import { baseApi } from '@/shared/api/baseApi';
import type { ProfileSettingsInput } from '../model/types';

export const profileSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateProfileSettings: builder.mutation<{ success: boolean }, ProfileSettingsInput>({
      query: (body) => ({ url: 'profile', method: 'PATCH', body }),
    }),
  }),
  overrideExisting: false,
});

export const { useUpdateProfileSettingsMutation } = profileSettingsApi;
