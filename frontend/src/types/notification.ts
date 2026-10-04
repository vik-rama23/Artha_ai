export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH";

export type NotificationType =
  | "BUDGET_WARNING"
  | "BUDGET_EXCEEDED"
  | "RECURRING_PAYMENT_DUE"
  | "RECURRING_PAYMENT_OVERDUE";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  priority: NotificationPriority | string;
  is_read: boolean;
  reference_type: string | null;
  reference_id: string | null;
  scheduled_for: string | null;
  created_at: string;
  read_at: string | null;
};

export type NotificationListResponse = {
  items: Notification[];
  total: number;
  unread_count: number;
};

export type UnreadCountResponse = {
  unread_count: number;
};
