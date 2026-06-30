"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

interface AppNotification {
  id: string;
  user_id: string;
  type: "timesheet_submitted" | "missing_hours";
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();
    let channelRef: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch initial notifications (last 10)
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data as AppNotification[]);
        setUnread(data.filter((n) => !n.is_read).length);
      }

      // Subscribe to new notifications for this user only
      channelRef = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new as AppNotification;
            setNotifications((prev) => [n, ...prev.slice(0, 9)]);
            setUnread((prev) => prev + 1);
          }
        )
        .subscribe();
    })();

    return () => {
      channelRef?.unsubscribe();
    };
  }, []);

  async function markAllRead() {
    if (!userId || !hasSupabaseEnv()) return;
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-secondary"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[#1B6B3A] transition-colors hover:text-[#155A30]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Bell className="h-7 w-7 text-gray-300" />
                <p className="text-sm text-muted-foreground">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 border-b border-gray-50 px-4 py-3 last:border-b-0",
                    !n.is_read && "bg-emerald-50/50"
                  )}
                >
                  {/* Unread dot */}
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.is_read ? "bg-gray-200" : "bg-[#1B6B3A]"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-gray-900">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 text-xs leading-snug text-gray-500">{n.body}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-gray-400">{formatTime(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
