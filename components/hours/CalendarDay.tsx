"use client";

import { useMemo } from "react";
import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";
import { formatHours } from "@/lib/hours";
import { isMonthLocked } from "@/lib/month-lock";
import { TimeEntry, Project } from "@/lib/types";
import { DraggableEntry } from "./DraggableEntry";
import { DroppableDay } from "./DroppableDay";
import { MonthLockedBanner } from "./MonthLockedBanner";
import { cn } from "@/lib/utils";

interface CalendarDayProps {
  date: Date;
  entries: TimeEntry[];
  projects: Project[];
  lockedMonths: Set<string>;
  onNewEntry: (date: string) => void;
  onEntryClick: (entry: TimeEntry) => void;
}

export function CalendarDay({
  date,
  entries,
  projects,
  lockedMonths,
  onNewEntry,
  onEntryClick,
}: CalendarDayProps) {
  const dateStr = format(date, "yyyy-MM-dd");
  const locked = isMonthLocked(date, lockedMonths);
  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const dayEntries = entries.filter((e) => e.date === dateStr);
  const submitted = dayEntries.length > 0 && dayEntries.every((e) => e.status === "submitted");
  const total = dayEntries.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-3">
      {locked && <MonthLockedBanner label={format(date, "MMMM yyyy")} />}

      <div
        className={cn(
          "flex items-baseline gap-2 border-b border-border pb-2",
          isToday(date) && "border-primary"
        )}
      >
        <span className={cn("text-lg font-semibold", isToday(date) && "text-primary")}>
          {format(date, "EEEE, d MMMM yyyy")}
        </span>
        {total > 0 && (
          <span className="text-sm text-muted-foreground">{formatHours(total)} logged</span>
        )}
      </div>

      <DroppableDay date={dateStr} locked={locked}>
        {dayEntries.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <div className="space-y-2">
            {dayEntries.map((entry) => (
              <DraggableEntry
                key={entry.id}
                entry={entry}
                project={projectMap.get(entry.project_id)}
                locked={locked || submitted}
                onClick={() => onEntryClick(entry)}
              />
            ))}
          </div>
        )}
      </DroppableDay>

      {!locked && !submitted && (
        <button
          onClick={() => onNewEntry(dateStr)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" /> Add entry
        </button>
      )}
    </div>
  );
}
