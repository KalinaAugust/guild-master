import { baseApi } from '@/shared/api/baseApi';
import type { Notification } from '../model/types';

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<Notification[], void>({
      query: () => 'notifications',
      providesTags: [{ type: 'Notification' as const, id: 'LIST' }],
    }),
    markAllRead: build.mutation<void, void>({
      query: () => ({ url: 'notifications/read', method: 'PATCH' }),
      invalidatesTags: [{ type: 'Notification' as const, id: 'LIST' }],
    }),
    markAsRead: build.mutation<void, string>({
      query: (id) => ({ url: `notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: [{ type: 'Notification' as const, id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetNotificationsQuery, useMarkAllReadMutation, useMarkAsReadMutation } = notificationApi;
