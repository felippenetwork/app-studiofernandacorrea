'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminNotificationsApi } from '@/lib/api';
import { AdminNotification } from '@/types';

export function useAdminNotifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: adminNotificationsApi.list,
    // Poll every 30 seconds for real-time-like updates
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const notifications: AdminNotification[] = data?.notifications ?? [];
  const unreadCount: number = data?.unreadCount ?? 0;

  const { mutate: markRead } = useMutation({
    mutationFn: (id: string) => adminNotificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: adminNotificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  return { notifications, unreadCount, isLoading, markRead, markAllRead };
}
