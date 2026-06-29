"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { NotificationBell } from "./NotificationBell";

export function TopBar({ email }: { email: string | null }) {
  const router = useRouter();

  async function signOut() {
    if (hasSupabaseEnv()) {
      await createClient().auth.signOut();
    }
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      {/* Brand shown on mobile (sidebar logo is hidden there) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-foreground">
          C
        </div>
        <span className="font-semibold">Cadence</span>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <NotificationBell />
        {email && (
          <span className="hidden max-w-[180px] truncate text-sm text-muted-foreground sm:block">
            {email}
          </span>
        )}
        <button
          onClick={signOut}
          aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
