"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Settings, HelpCircle, LogOut } from "lucide-react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { NotificationBell } from "./NotificationBell";

function getInitials(email: string): string {
  const prefix = email.split("@")[0];
  const parts = prefix.split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return prefix.slice(0, 2).toUpperCase();
}

interface TopBarProps {
  email: string | null;
  fullName?: string | null;
}

export function TopBar({ email, fullName }: TopBarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initials = email ? getInitials(email) : "?";
  const displayName = fullName ?? (email ? email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "User");

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function signOut() {
    setOpen(false);
    if (hasSupabaseEnv()) {
      await createClient().auth.signOut();
    }
    router.push("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 bg-background px-4 shadow-sm md:px-6">
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

        {/* Avatar button + dropdown */}
        <div className="relative" ref={containerRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="User menu"
            className="flex items-center justify-center rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{
              width: 34,
              height: 34,
              background: "linear-gradient(135deg, #1B6B3A, #2D9A5A)",
            }}
          >
            {initials}
          </button>

          {open && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[12px] bg-white"
              style={{ width: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}
            >
              {/* User header */}
              <div className="px-4 py-3">
                <p className="truncate text-[13px] font-semibold text-gray-900">{displayName}</p>
                {email && (
                  <p className="mt-0.5 truncate text-[11px] text-[#9CA3AF]">{email}</p>
                )}
              </div>

              <div className="h-px bg-gray-100" />

              {/* Profile / settings */}
              <div className="py-1">
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  My Profile
                </Link>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Settings className="h-3.5 w-3.5 text-gray-400" />
                  Account Settings
                </Link>
              </div>

              <div className="h-px bg-gray-100" />

              <div className="py-1">
                <button
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                  Help &amp; Guide
                </button>
              </div>

              <div className="h-px bg-gray-100" />

              <div className="py-1">
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[#EF4444] transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
