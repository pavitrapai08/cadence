"use client";

import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { ProjectCard } from "./ProjectCard";
import { ProjectCreateEditModal } from "./ProjectCreateEditModal";
import { ProjectFull } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterMode = "all" | "active" | "archived";

interface ProjectsShellProps {
  initialProjects: ProjectFull[];
  isAdmin: boolean;
}

export function ProjectsShell({ initialProjects, isAdmin }: ProjectsShellProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectFull | null>(null);

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.external_id ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && p.is_active) ||
      (filter === "archived" && !p.is_active);
    return matchesSearch && matchesFilter;
  });

  function handleSaved(project: ProjectFull) {
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === project.id);
      return idx >= 0 ? prev.map((p) => (p.id === project.id ? project : p)) : [project, ...prev];
    });
    setCreateOpen(false);
    setEditTarget(null);
  }

  async function handleToggleActive(project: ProjectFull) {
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !project.is_active }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed."); return; }
      setProjects((prev) => prev.map((p) => (p.id === project.id ? json.data : p)));
      toast.success(project.is_active ? "Project archived." : "Project restored.");
    } catch {
      toast.error("Something went wrong.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="-mx-4 -mt-4 mb-6 md:-mx-6 md:-mt-6">
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
            <h1 className="text-2xl font-bold tracking-tight text-white">Projects</h1>
            <p className="mt-1.5 text-sm" style={{ color: "rgba(167,243,208,0.75)" }}>
              {projects.filter((p) => p.is_active).length} active project
              {projects.filter((p) => p.is_active).length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center rounded-lg bg-muted p-0.5 text-sm">
          {(["active", "all", "archived"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-3 py-1 capitalize font-medium transition-all",
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Admin: new project */}
        {isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#1B6B3A" }}
          >
            <Plus className="h-4 w-4" /> New project
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-sm font-medium text-gray-500">
            {search ? "No projects match your search" : "No projects found"}
          </p>
          {isAdmin && !search && (
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              isAdmin={isAdmin}
              onEdit={setEditTarget}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {createOpen && (
        <ProjectCreateEditModal
          onClose={() => setCreateOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {editTarget && (
        <ProjectCreateEditModal
          existing={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
