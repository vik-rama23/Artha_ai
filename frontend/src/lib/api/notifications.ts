import { apiClient } from "@/lib/api/client";
import type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
} from "@/types/notification";

export async function getNotifications(
  isRead?: boolean,
  limit = 50,
): Promise<NotificationListResponse> {
  const params = new URLSearchParams();

  if (isRead !== undefined) {
    params.set("is_read", String(isRead));
  }

  params.set("limit", String(limit));

  return apiClient<NotificationListResponse>(
    `/api/v1/notifications?${params.toString()}`,
  );
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient<UnreadCountResponse>(
    "/api/v1/notifications/unread-count",
  );

  return response.unread_count;
}

export async function markNotificationRead(
  notificationId: string,
): Promise<Notification> {
  return apiClient<Notification>(
    `/api/v1/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    },
  );
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await apiClient<{ updated: number }>(
    "/api/v1/notifications/read-all",
    {
      method: "PATCH",
    },
  );

  return response.updated;
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  await apiClient<void>(
    `/api/v1/notifications/${notificationId}`,
    {
      method: "DELETE",
    },
  );
}
