"use client";

import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import type { Notification } from "@/types/notification";

import styles from "./notifications.module.scss";

function getIcon(notification: Notification) {
  if (notification.type === "BUDGET_EXCEEDED") {
    return <AlertTriangle size={17} />;
  }

  if (
    notification.type === "RECURRING_PAYMENT_DUE" ||
    notification.type === "RECURRING_PAYMENT_OVERDUE"
  ) {
    return <Clock3 size={17} />;
  }

  return <CheckCircle2 size={17} />;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadNotifications() {
    setLoading(true);
    setError(false);

    try {
      const response = await getNotifications(undefined, 100);
      setNotifications(response.items);
      setUnreadCount(response.unread_count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleRead(notification: Notification) {
    if (notification.is_read) {
      return;
    }

    setBusyId(notification.id);

    try {
      await markNotificationRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : item,
        ),
      );

      setUnreadCount((current) => Math.max(current - 1, 0));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) {
      return;
    }

    setBusyId("all");

    try {
      await markAllNotificationsRead();

      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at || now,
        })),
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(notificationId: string) {
    setBusyId(notificationId);

    try {
      await deleteNotification(notificationId);

      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId),
      );
    } catch (err) {
      console.error("Failed to delete notification:", err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>ALERTS & NOTIFICATIONS</p>
          <h1>Notifications</h1>
          <p className={styles.subtitle}>
            Stay informed about your budgets and scheduled payments.
          </p>
        </div>

        <button
          type="button"
          className={styles.markAllButton}
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0 || busyId === "all"}
        >
          <Check size={16} />
          {busyId === "all" ? "Updating..." : "Mark all as read"}
        </button>
      </header>

      <section className={styles.card}>
        {loading ? (
          <div className={styles.state}>Loading notifications...</div>
        ) : error ? (
          <div className={styles.state}>
            <strong>Unable to load notifications</strong>
            <span>
              Make sure the FastAPI backend is running and your session is
              active.
            </span>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.state}>
            <Bell size={28} />
            <strong>No notifications yet</strong>
            <span>
              Budget warnings and recurring-payment reminders will appear
              here automatically.
            </span>
          </div>
        ) : (
          <div className={styles.list}>
            {notifications.map((notification) => (
              <article
                key={notification.id}
                className={`${styles.item} ${
                  !notification.is_read ? styles.itemUnread : ""
                }`}
              >
                <div className={styles.icon}>
                  {getIcon(notification)}
                </div>

                <div className={styles.content}>
                  <div className={styles.itemHeader}>
                    <div>
                      <h2>{notification.title}</h2>
                      <span className={styles.priority}>
                        {notification.priority}
                      </span>
                    </div>

                    <time dateTime={notification.created_at}>
                      {formatDate(notification.created_at)}
                    </time>
                  </div>

                  <p>{notification.message}</p>

                  <div className={styles.actions}>
                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={() => handleRead(notification)}
                        disabled={busyId === notification.id}
                      >
                        <Check size={14} />
                        Mark as read
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDelete(notification.id)}
                      disabled={busyId === notification.id}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
