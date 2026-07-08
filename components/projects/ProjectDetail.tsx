"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, Plus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatHours } from "@/lib/hours";
import { ProjectFull, ProjectStats, UserBasic } from "@/lib/types";
import { DonutChart } from "./DonutChart";
import { WeeklyBarChart } from "./WeeklyBarChart";
import { TagUsageBars } from "./TagUsageBars";
import { ProjectCreateEditModal } from "./ProjectCreateEditModal";
import { cn } from "@/lib/utils";

type MemberUser = Pick<UserBasic, "id" | "email" | "full_name">;

function memberInitials(m: MemberUser): string {
  if (m.full_name) {
    const parts = m.full_name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return m.full_name.slice(0, 2).toUpperCase();
  }
  return m.email.slice(0, 2).toUpperCase();
}

interface ProjectDetailProps {
  project: ProjectFull;
  stats: ProjectStats;
  isAdmin: boolean;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-light text-gray-900">{value}</p>
    </div>
  );
}

export function ProjectDetail({ project: initial, stats, isAdmin }: ProjectDetailProps) {
  const [project, setProject] = useState(initial);
  const [editOpen, setEditOpen] = useState(false);

  // Member management state (admin only)
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [allUsers, setAllUsers] = useState<UserBasic[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addingOpen, setAddingOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setLoadingMembers(true);
    Promise.all([
      fetch(`/api/projects/${project.id}/members`).then((r) => r.json()),
      fetch("/api/admin/users").then((r) => r.json()),
    ])
      .then(([mJson, uJson]) => {
        setMembers(mJson.data ?? []);
        setAllUsers(uJson.data ?? []);
      })
      .catch(() => toast.error("Failed to load members."))
      .finally(() => setLoadingMembers(false));
  }, [isAdmin, project.id]);

  const memberIds = new Set(members.map((m) => m.id));
  const filteredUsers = allUsers.filter(
    (u) =>
      !memberIds.has(u.id) &&
      (u.email.includes(memberSearch) ||
        (u.full_name ?? "").toLowerCase().includes(memberSearch.toLowerCase()))
  );

  async function addMember(u: UserBasic) {
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    });
    if (res.ok) {
      setMembers((prev) => [...prev, u]);
      setMemberSearch("");
    } else {
      toast.error("Failed to add member.");
    }
  }

  async function removeMember(userId: string) {
    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== userId));
    else toast.error("Failed to remove member.");
  }

  async function handleArchiveToggle() {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !project.is_active }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed."); return; }
      setProject(json.data);
      toast.success(project.is_active ? "Project archived." : "Project restored.");
    } catch {
      toast.error("Something went wrong.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/projects"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Projects
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="mt-1 h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: project.colour }}
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{project.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                {project.client && <span>{project.client.name}</span>}
                {project.client && project.external_id && <span>·</span>}
                {project.external_id && (
                  <span className="font-mono text-xs">{project.external_id}</span>
                )}
              </div>
              {project.description && (
                <p className="mt-1 text-sm text-gray-500">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                project.is_active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {project.is_active ? "Active" : "Archived"}
            </span>
            {isAdmin && (
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stat widgets */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total logged" value={formatHours(stats.totalHours)} />
        <StatCard label="This week" value={formatHours(stats.thisWeekHours)} />
        <StatCard label="This month" value={formatHours(stats.thisMonthHours)} />
      </div>

      {/* Charts row */}
      {stats.totalHours > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Donut */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Billable breakdown</h2>
            <DonutChart
              billableHours={stats.billableHours}
              nonBillableHours={stats.nonBillableHours}
              totalHours={stats.totalHours}
            />
          </div>

          {/* Weekly bar */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Last 5 weeks</h2>
            <WeeklyBarChart data={stats.lastFiveWeeks} />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-gray-500">No hours logged yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Start tracking time on this project to see charts here.
          </p>
        </div>
      )}

      {/* Tag usage */}
      {stats.tagUsage.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Tag breakdown</h2>
          <TagUsageBars tagUsage={stats.tagUsage} projectColour={project.colour} />
        </div>
      )}

      {/* Team members — admin only */}
      {isAdmin && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Team members</h2>
            <button
              onClick={() => setAddingOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Plus className="h-3 w-3" />
              Add member
            </button>
          </div>

          {loadingMembers ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : members.length === 0 && !addingOpen ? (
            <p className="text-sm text-gray-400">No members assigned yet.</p>
          ) : (
            <div className="space-y-1.5">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #1B6B3A, #2D9A5A)" }}
                    >
                      {memberInitials(m)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-800">{m.full_name ?? m.email}</p>
                      <p className="text-[11px] text-gray-400">{m.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-gray-300 transition-colors hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add member panel */}
          {addingOpen && (
            <div className={cn("rounded-lg border border-gray-200", members.length > 0 && "mt-3")}>
              <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <input
                  autoFocus
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search users to add…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>
              <div className="max-h-[180px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-gray-400">
                    {memberSearch ? "No users found." : "All users are already members."}
                  </p>
                ) : (
                  filteredUsers.slice(0, 10).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addMember(u)}
                      className="flex w-full items-center gap-2 border-b border-gray-50 px-3 py-2 text-left text-xs last:border-b-0 hover:bg-gray-50"
                    >
                      <Plus className="h-3 w-3 shrink-0 text-gray-400" />
                      <span className="truncate font-medium text-gray-700">{u.full_name ?? u.email}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-gray-400">{u.role}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin archive toggle */}
      {isAdmin && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">
                {project.is_active ? "Archive project" : "Restore project"}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {project.is_active
                  ? "Archived projects are hidden from the entry modal but kept in reports."
                  : "Restoring makes this project available again in the entry modal."}
              </p>
            </div>
            <button
              onClick={handleArchiveToggle}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                project.is_active
                  ? "border border-red-200 text-red-600 hover:bg-red-50"
                  : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {project.is_active ? "Archive" : "Restore"}
            </button>
          </div>
        </div>
      )}

      {editOpen && (
        <ProjectCreateEditModal
          existing={project}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setProject(updated);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
