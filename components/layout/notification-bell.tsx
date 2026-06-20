"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/lib/actions/search";
import type { Notification } from "@/lib/data/types";
import { formatRelativeTime } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function load() {
    const { notifications: data } = await getNotificationsAction();
    setNotifications(data ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  async function handleRead(id: string, link?: string) {
    await markNotificationReadAction(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (link) {
      setOpen(false);
      window.location.href = link;
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setOpen(!open);
          void load();
        }}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
            <span className="text-sm font-medium text-zinc-200">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={async () => {
                  await markAllNotificationsReadAction();
                  void load();
                }}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-zinc-500">
                No notifications
              </li>
            ) : (
              notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleRead(n.id, n.link)}
                    className={`w-full px-3 py-2 text-left hover:bg-zinc-800 ${
                      !n.read ? "bg-violet-500/5" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-zinc-200">{n.title}</p>
                    {n.body && (
                      <p className="truncate text-xs text-zinc-500">{n.body}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
