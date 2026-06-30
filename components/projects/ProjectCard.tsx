"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { ProjectFull } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: ProjectFull;
  isAdmin?: boolean;
  onEdit?: (project: ProjectFull) => void;
  onToggleActive?: (project: ProjectFull) => void;
}

export function ProjectCard({ project, isAdmin, onEdit, onToggleActive }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white transition-all hover:shadow-md",
        project.is_active ? "border-gray-100 shadow-sm" : "border-gray-100 opacity-60 shadow-sm"
      )}
    >
      {/* Colour stripe */}
      <div
        className="absolute inset-y-0 left-0 w-1.5 rounded-l-2xl"
        style={{ backgroundColor: project.colour }}
      />

      <Link href={`/projects/${project.id}`} className="block px-5 py-4 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* Project name */}
            <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">
              {project.name}
            </h3>

            {/* Client */}
            {project.client && (
              <p className="mt-0.5 truncate text-xs text-gray-500">{project.client.name}</p>
            )}

            {/* External ID */}
            {project.external_id && (
              <p className="mt-1 font-mono text-[10px] text-gray-400">{project.external_id}</p>
            )}
          </div>

          {/* Active badge + admin menu */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                project.is_active
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              )}
            >
              {project.is_active ? "Active" : "Archived"}
            </span>

            {isAdmin && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen((o) => !o);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                    />
                    <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenuOpen(false);
                          onEdit?.(project);
                        }}
                      >
                        <Pencil className="h-3 w-3" /> Edit project
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenuOpen(false);
                          onToggleActive?.(project);
                        }}
                      >
                        {project.is_active
                          ? <><Archive className="h-3 w-3" /> Archive</>
                          : <><ArchiveRestore className="h-3 w-3" /> Restore</>
                        }
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
