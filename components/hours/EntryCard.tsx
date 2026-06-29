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
        "group relative flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-sm shadow-sm transition-shadow hover:shadow-md",
        isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
      )}
    >
      {/* project colour stripe */}
      <div
        className="mt-0.5 h-3 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: colour }}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-tight">
          {project?.name ?? "Unknown project"}
        </p>
        {note && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="text-xs font-medium tabular-nums">
          {formatHours(entry.hours)}
        </span>
        {locked ? (
          <Lock className="h-3 w-3 text-amber-500" />
        ) : (
          <div
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="hidden cursor-grab text-muted-foreground group-hover:block active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}
