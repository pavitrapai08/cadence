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
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50/80 via-emerald-50/30 to-[#F8FAFB] px-4 py-7 md:px-6">
          <div className="pointer-events-none absolute right-10 top-3 h-10 w-10 rounded-full bg-slate-100/50" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Account</h1>
          <p className="mt-1 text-sm text-gray-500">
            Profile, notifications{isAdmin ? ", and workspace settings" : ""}
          </p>
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
