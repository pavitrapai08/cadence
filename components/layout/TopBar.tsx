"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Settings, HelpCircle, LogOut, Clock, Sparkles, Send, Bell, X } from "lucide-react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { NotificationBell } from "./NotificationBell";

const HELP_TIPS = [
  {
    icon: Clock,
    title: "Log hours",
    body: "Click '+ New' on any day column or tap an empty slot. Quick buttons: 15 m, 30 m, 1 h, 2 h. Drag an entry card to move it to another day.",
  },
  {
    icon: Sparkles,
    title: "Polish with AI",
    body: "Inside an entry, write rough notes then click 'Polish with AI' — Claude rewrites them into one crisp, professional sentence.",
  },
  {
    icon: Send,
    title: "Submit your week",
    body: "Click 'Submit week' in the Hours header. You'll be warned if any Mon–Fri day is empty. Submitted weeks are read-only.",
  },
  {
    icon: Bell,
    title: "Daily reminders",
    body: "Go to Account → Notifications to pick which days and what time you receive a missing-hours alert in the bell.",
  },
];

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative overflow-hidden rounded-t-2xl px-6 py-5"
          style={{ background: "linear-gradient(135deg, #071a10 0%, #0d2b1c 40%, #0a1e3a 100%)" }}
        >
          <div className="pointer-events-none absolute right-4 top-[-40%] h-32 w-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(52,211,153,0.35) 0%, transparent 70%)" }} />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-white/20">
              <HelpCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "rgba(167,243,208,0.75)" }}>Cadence</p>
              <h2 className="text-base font-semibold text-white">Quick Guide</h2>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="divide-y divide-gray-100 px-6 py-2">
          {HELP_TIPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3.5 py-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="mt-0.5 text-sm leading-snug text-gray-500">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-b-2xl border-t border-gray-100 bg-gray-50 px-6 py-3">
          <p className="text-center text-xs text-gray-400">
            More questions? Reach out to your admin.
          </p>
        </div>
      </div>
    </div>
  );
}

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
  const [helpOpen, setHelpOpen] = useState(false);
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
                  href="/account?tab=workspace"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <Settings className="h-3.5 w-3.5 text-gray-400" />
                  Workspace Settings
                </Link>
              </div>

              <div className="h-px bg-gray-100" />

              <div className="py-1">
                <button
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  onClick={() => { setOpen(false); setHelpOpen(true); }}
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

    {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
  );
}
