"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Top-bar notification bell. Phase 0: static shell (0 unread, empty dropdown).
 * Supabase Realtime subscription + unread count wired in Phase 2 / Phase 5.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 z-50 mt-2 w-80 rounded-md border bg-popover p-2 shadow-md",
          )}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-medium">Notifications</span>
            <button className="text-xs text-muted-foreground hover:text-foreground">
              Mark all read
            </button>
          </div>
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        </div>
      )}
    </div>
  );
}
