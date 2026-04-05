"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  MessageSquare,
  ListTodo,
  BookOpen,
  Mic2,
  X,
} from "lucide-react";
import type { Notification } from "@/lib/types";

const TYPE_ICONS: Record<string, React.ElementType> = {
  feedback: MessageSquare,
  task: ListTodo,
  guide: BookOpen,
  lecture: Mic2,
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "עכשיו";
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  if (diffHr < 24) return `לפני ${diffHr} שעות`;
  return `לפני ${diffDay} ימים`;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // silently ignore
    }
  }, []);

  // Fetch on mount and poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAsRead(ids: string[]) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    );
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleNotificationClick(n: Notification) {
    if (!n.read) {
      markAsRead([n.id]);
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center size-9 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        aria-label="התראות"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -left-0.5 flex items-center justify-center size-5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 md:left-auto md:right-0 top-full mt-2 w-[calc(100vw-2rem)] md:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-[#1a2744]">התראות</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Bell className="size-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">אין התראות חדשות</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-right transition-colors hover:bg-gray-50 ${
                      !n.read
                        ? "border-r-[3px] border-r-[#22c55e] bg-[#22c55e]/[0.03]"
                        : "border-r-[3px] border-r-transparent opacity-60"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex items-center justify-center size-8 shrink-0 rounded-full ${
                        !n.read
                          ? "bg-[#22c55e]/10 text-[#22c55e]"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          !n.read
                            ? "font-medium text-[#1a2744]"
                            : "text-gray-500"
                        }`}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-300 mt-1">
                        {relativeTime(n.created_at)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {unreadCount > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <button
                onClick={markAllRead}
                className="w-full text-center text-sm font-medium text-[#22c55e] hover:text-[#16a34a] transition-colors"
              >
                סמן הכל כנקרא
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
