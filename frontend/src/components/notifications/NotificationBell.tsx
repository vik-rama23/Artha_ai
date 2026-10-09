"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  X,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
} from "@/lib/api/notifications";
import type { Notification } from "@/types/notification";

import styles from "./NotificationBell.module.scss";

function getIcon(notification: Notification) {
  if (notification.type === "BUDGET_EXCEEDED") {
    return <AlertTriangle size={16} />;
  }

  if (notification.type === "UNUSUAL_SPENDING") {
    return <TrendingUp size={16} />;
  }

  if (
    notification.type === "RECURRING_PAYMENT_OVERDUE" ||
    notification.type === "RECURRING_PAYMENT_DUE"
  ) {
    return <Clock3 size={16} />;
  }

  return <CheckCircle2 size={16} />;
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  async function refreshCount() {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to load notification count:", error);
    }
  }

  async function openNotifications() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    setLoading(true);

    try {
      const response = await getNotifications(undefined, 5);
      setNotifications(response.items);
      setUnreadCount(response.unread_count);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRead(notification: Notification) {
    if (!notification.is_read) {
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
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
  }

  useEffect(() => {
    refreshCount();

    const interval = window.setInterval(refreshCount, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.bellButton}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        onClick={openNotifications}
      >
        <Bell size={20} strokeWidth={1.9} />

        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <div>
              <strong>Notifications</strong>
              <span>
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </span>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.list}>
            {loading ? (
              <div className={styles.state}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div className={styles.state}>
                <Bell size={22} />
                <span>No notifications yet.</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href="/notifications"
                  className={`${styles.item} ${
                    !notification.is_read ? styles.itemUnread : ""
                  }`}
                  onClick={() => handleRead(notification)}
                >
                  <span className={styles.itemIcon}>
                    {getIcon(notification)}
                  </span>

                  <span className={styles.itemContent}>
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                  </span>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            className={styles.viewAll}
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
