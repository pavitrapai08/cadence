"use client";

import { TimeEntry, Project } from "@/lib/types";
import { formatHours } from "@/lib/hours";
import { Lock, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntryCardProps {
  entry: TimeEntry;
  project: Project | undefined;
  locked: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onClick: () => void;
}

export function EntryCard({
  entry,
  project,
  locked,
  isDragging,
  dragHandleProps,
  onClick,
}: EntryCardProps) {
  const colour = project?.colour ?? "#94a3b8";
  const note = entry.ai_description || entry.raw_notes;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer items-stretch gap-0 overflow-hidden rounded-md border border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-border/80",
        isDragging && "opacity-60 shadow-lg ring-2 ring-primary/40 rotate-1"
      )}
    >
      {/* Project colour stripe — 3px left accent */}
      <div className="w-[3px] shrink-0" style={{ backgroundColor: colour }} />

      <div className="flex min-w-0 flex-1 items-start gap-2 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight text-foreground">
            {project?.name ?? "Unknown project"}
          </p>
          {note && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 pt-px">
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: colour }}
          >
            {formatHours(entry.hours)}
          </span>
          {locked ? (
            <Lock className="h-3 w-3 text-amber-500" />
          ) : (
            <div
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              className="hidden cursor-grab text-muted-foreground/50 group-hover:block active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
