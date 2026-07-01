"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Pacific/Auckland",
  "UTC",
];

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  capacity_hours: number;
  timezone: string;
}

interface PersonalSettingsProps {
  profile: ProfileData;
}

export function PersonalSettings({ profile: initial }: PersonalSettingsProps) {
  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [capacityHours, setCapacityHours] = useState(String(initial.capacity_hours));
  const [timezone, setTimezone] = useState(initial.timezone);
  const [saving, setSaving] = useState(false);

  async function save() {
    const capacity = parseFloat(capacityHours);
    if (isNaN(capacity) || capacity <= 0) {
      toast.error("Capacity must be a positive number.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim() || null, capacity_hours: capacity, timezone }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed to save."); return; }
      toast.success("Profile saved.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const initials = initial.email
    ? (() => {
        const p = initial.email.split("@")[0].split(/[._-]/);
        return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
      })()
    : "?";

  return (
    <div className="space-y-5">
      {/* Avatar row */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ background: "linear-gradient(135deg, #1B6B3A, #2D9A5A)" }}
        >
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {initial.full_name ?? initial.email.split("@")[0]}
          </p>
          <p className="text-xs text-gray-400">{initial.email}</p>
          <span className="mt-0.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium capitalize text-gray-500">
            {initial.role}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Full name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Display name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition-colors focus:border-[#1B6B3A]"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
          <input
            type="text"
            value={initial.email}
            readOnly
            className="w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 outline-none cursor-not-allowed"
          />
        </div>

        {/* Timezone */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#1B6B3A]"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        {/* Weekly capacity */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Weekly capacity (hours)</label>
          <input
            type="number"
            value={capacityHours}
            onChange={(e) => setCapacityHours(e.target.value)}
            min="1"
            max="168"
            step="1"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#1B6B3A]"
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 rounded-full bg-[#1B6B3A] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#155530] transition-colors disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save changes
      </button>
    </div>
  );
}
