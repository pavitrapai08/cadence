"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, Save, Loader2 } from "lucide-react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { useEffect } from "react";

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

interface NotificationData {
  notification_days: string[];
  notification_time: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationSettings({ initial }: { initial: NotificationData }) {
  const [days, setDays] = useState<string[]>(initial.notification_days ?? ["monday","tuesday","wednesday","thursday","friday"]);
  const [time, setTime] = useState(initial.notification_time?.slice(0, 5) ?? "17:00");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Notification[]>([]);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, is_read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setHistory(data as Notification[]);
    })();
  }, []);

  function toggleDay(key: DayKey) {
    setDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_days: days, notification_time: time }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed to save."); return; }
      toast.success("Notification preferences saved.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffH = Math.floor(diffMins / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-6">
      {/* Reminder config */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#1B6B3A]" />
          <h3 className="text-sm font-semibold text-gray-900">Daily hours reminder</h3>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">Remind me on</p>
          <div className="flex gap-1.5">
            {DAYS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleDay(key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  days.includes(key)
                    ? "bg-[#1B6B3A] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-gray-600">At time (in your timezone)</p>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#1B6B3A]"
          />
        </div>

        <p className="text-xs text-gray-400">
          You receive a bell notification if you have not logged hours by this time. Powered by Supabase pg_cron — no email.
        </p>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-[#1B6B3A] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#155530] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save preferences
        </button>
      </div>

      {/* Notification history */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-50 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Recent notifications</h3>
        </div>
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Bell className="h-7 w-7 text-gray-200" />
            <p className="text-sm text-gray-400">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((n) => (
              <div key={n.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-gray-200" : "bg-[#1B6B3A]"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>}
                  <p className="mt-0.5 text-[11px] text-gray-400">{formatTime(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
