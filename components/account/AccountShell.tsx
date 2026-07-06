"use client";

import { useState } from "react";
import { User, Bell, Settings2 } from "lucide-react";
import { PersonalSettings } from "./PersonalSettings";
import { NotificationSettings } from "./NotificationSettings";
import { WorkspaceSettings } from "./WorkspaceSettings";

type AccountTab = "profile" | "notifications" | "workspace";

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  capacity_hours: number;
  timezone: string;
  notification_days: string[];
  notification_time: string;
}

interface AccountShellProps {
  profile: ProfileData;
}

export function AccountShell({ profile }: AccountShellProps) {
  const isAdmin = profile.role === "admin";
  const [tab, setTab] = useState<AccountTab>("profile");

  const TABS: { key: AccountTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { key: "profile", label: "Profile", icon: <User className="h-3.5 w-3.5" /> },
    { key: "notifications", label: "Notifications", icon: <Bell className="h-3.5 w-3.5" /> },
    ...(isAdmin
      ? [{ key: "workspace" as AccountTab, label: "Workspace", icon: <Settings2 className="h-3.5 w-3.5" />, adminOnly: true }]
      : []),
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6">
        <div
          className="relative overflow-hidden px-4 py-10 md:px-8 md:py-12"
          style={{ background: "linear-gradient(135deg, #071a10 0%, #0d2b1c 40%, #0a1e3a 100%)" }}
        >
          <div className="hero-orb-a pointer-events-none absolute right-[12%] top-[-50%] h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(52,211,153,0.40) 0%, transparent 70%)" }} />
          <div className="hero-orb-b pointer-events-none absolute right-[-3%] bottom-[-65%] h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.30) 0%, transparent 70%)" }} />
          <div className="hero-orb-c pointer-events-none absolute left-[55%] top-[-25%] h-52 w-52 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.34) 0%, transparent 70%)" }} />
          <div className="hero-orb-d pointer-events-none absolute left-[38%] bottom-[-45%] h-44 w-44 rounded-full" style={{ background: "radial-gradient(circle, rgba(20,184,166,0.28) 0%, transparent 70%)" }} />
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative">
            <h1 className="text-2xl font-bold tracking-tight text-white">Account</h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(167,243,208,0.75)" }}>
              Profile, notifications{isAdmin ? ", and workspace settings" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100 pb-0">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 pb-3 pt-1 text-sm font-medium transition-colors ${
              tab === key
                ? "border-[#1B6B3A] text-[#1B6B3A]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-w-2xl">
        {tab === "profile" && <PersonalSettings profile={profile} />}
        {tab === "notifications" && (
          <NotificationSettings
            initial={{
              notification_days: profile.notification_days,
              notification_time: profile.notification_time,
            }}
          />
        )}
        {tab === "workspace" && isAdmin && <WorkspaceSettings />}
      </div>
    </div>
  );
}
