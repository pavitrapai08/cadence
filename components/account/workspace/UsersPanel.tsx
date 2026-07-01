"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, UserCircle } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  manager_id: string | null;
  capacity_hours: number;
  is_active: boolean;
}

const ROLES = ["employee", "manager", "admin"];

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (res.ok) setUsers(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function patchUser(id: string, patch: Partial<AdminUser>) {
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed to update."); return; }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...json.data } : u)));
      toast.success("User updated.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
      </div>
    );
  }

  const activeUsers = users.filter((u) => u.is_active);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">{activeUsers.length} active users</p>
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400">User</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400">Role</th>
              <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400">Manager</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-400">Capacity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {activeUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <UserCircle className="h-5 w-5 shrink-0 text-gray-300" />
                    <div>
                      <p className="font-medium text-gray-800">{u.full_name ?? u.email.split("@")[0]}</p>
                      <p className="text-[11px] text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={saving === u.id}
                    onChange={(e) => patchUser(u.id, { role: e.target.value })}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium capitalize text-gray-700 outline-none focus:border-[#1B6B3A]"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.manager_id ?? ""}
                    disabled={saving === u.id}
                    onChange={(e) => patchUser(u.id, { manager_id: e.target.value || null })}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 outline-none focus:border-[#1B6B3A]"
                  >
                    <option value="">No manager</option>
                    {activeUsers
                      .filter((m) => m.id !== u.id && (m.role === "manager" || m.role === "admin"))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name ?? m.email.split("@")[0]}
                        </option>
                      ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="number"
                    value={u.capacity_hours}
                    min="1"
                    max="168"
                    disabled={saving === u.id}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0 && v !== u.capacity_hours) patchUser(u.id, { capacity_hours: v });
                    }}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((uu) =>
                          uu.id === u.id ? { ...uu, capacity_hours: parseInt(e.target.value, 10) || uu.capacity_hours } : uu
                        )
                      )
                    }
                    className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1 text-right text-xs text-gray-700 outline-none focus:border-[#1B6B3A]"
                  />
                  <span className="ml-1 text-[11px] text-gray-400">h</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
