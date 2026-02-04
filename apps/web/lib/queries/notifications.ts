import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { PaginatedResult } from '@nerva/shared';

const NOTIFICATIONS_KEY = 'notifications';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string | null;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  category: 'SALES' | 'INVENTORY' | 'PROCUREMENT' | 'SYSTEM';
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

// Fetch notifications
export function useNotifications(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.unreadOnly) searchParams.set('unreadOnly', 'true');

      const response = await api.get<PaginatedResult<Notification>>(
        `/notifications?${searchParams.toString()}`
      );
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// Fetch unread count
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, 'count'],
    queryFn: async () => {
      const response = await api.get<{ count: number }>('/notifications/count');
      return response.data.count;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Mark notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<Notification>(`/notifications/${id}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}
