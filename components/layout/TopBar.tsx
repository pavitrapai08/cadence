"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { NotificationBell } from "./NotificationBell";

function getInitials(email: string): string {
  const prefix = email.split("@")[0];
  const parts = prefix.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return prefix.slice(0, 2).toUpperCase();
}

export function TopBar({ email }: { email: string | null }) {
  const router = useRouter();

  async function signOut() {
    if (hasSupabaseEnv()) {
      await createClient().auth.signOut();
    }
    router.push("/login");
  }

  const initials = email ? getInitials(email) : "?";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 md:px-6">
      {/* Brand on mobile */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-foreground">
          C
        </div>
        <span className="font-semibold">Cadence</span>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <NotificationBell />

        {/* User avatar + email */}
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
            {initials}
          </div>
          {email && (
            <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground sm:block">
              {email}
            </span>
          )}
        </div>

        <button
          onClick={signOut}
          aria-label="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
