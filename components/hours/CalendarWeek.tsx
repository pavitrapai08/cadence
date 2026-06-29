"use client";

import { useMemo } from "react";
import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";
import { weekDays } from "@/lib/week";
import { formatHours } from "@/lib/hours";
import { isMonthLocked } from "@/lib/month-lock";
import { TimeEntry, Project } from "@/lib/types";
import { DraggableEntry } from "./DraggableEntry";
import { DroppableDay } from "./DroppableDay";
import { MonthLockedBanner } from "./MonthLockedBanner";
import { cn } from "@/lib/utils";
import { format as fmt } from "date-fns";

interface CalendarWeekProps {
  weekStart: Date;
  entries: TimeEntry[];
  projects: Project[];
  lockedMonths: Set<string>;
  onNewEntry: (date: string) => void;
  onEntryClick: (entry: TimeEntry) => void;
}

export function CalendarWeek({
  weekStart,
  entries,
  projects,
  lockedMonths,
  onNewEntry,
  onEntryClick,
}: CalendarWeekProps) {
  const allDays = weekDays(weekStart); // Mon–Sun (7)

  const byDate = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const e of entries) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [entries]);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  // Show Sat/Sun only if they have entries
  const satDate = fmt(allDays[5], "yyyy-MM-dd");
  const sunDate = fmt(allDays[6], "yyyy-MM-dd");
  const days = allDays.filter((_, i) => {
    if (i < 5) return true;
    if (i === 5) return (byDate.get(satDate) ?? []).length > 0;
    return (byDate.get(sunDate) ?? []).length > 0;
  });

  // Locked-month banners (de-duped by month)
  const lockedBanners = useMemo(() => {
    const seen = new Set<string>();
    const result: { key: string; label: string }[] = [];
    for (const day of days) {
      if (isMonthLocked(day, lockedMonths)) {
        const key = fmt(day, "yyyy-MM");
        if (!seen.has(key)) { seen.add(key); result.push({ key, label: format(day, "MMMM yyyy") }); }
      }
    }
    return result;
  }, [days, lockedMonths]);

  return (
    <div>
      {lockedBanners.map((b) => (
        <MonthLockedBanner key={b.key} label={b.label} />
      ))}

      {/* Full-width column grid — no gaps, separated by borders */}
      <div className="flex overflow-hidden rounded-lg border border-border">
        {days.map((day, idx) => {
          const dateStr = fmt(day, "yyyy-MM-dd");
          const dayEntries = byDate.get(dateStr) ?? [];
          const locked = isMonthLocked(day, lockedMonths);
          const submitted = dayEntries.length > 0 && dayEntries.every((e) => e.status === "submitted");
          const dailyTotal = dayEntries.reduce((s, e) => s + e.hours, 0);
          const today = isToday(day);

          return (
            <div
              key={dateStr}
              className={cn(
                "flex flex-1 flex-col min-w-0",
                idx < days.length - 1 && "border-r border-border"
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  "select-none border-b border-border px-3 py-3",
                  today ? "bg-primary/5" : "bg-muted/30"
                )}
              >
                <div className={cn("text-[11px] font-medium uppercase tracking-widest", today ? "text-primary" : "text-muted-foreground")}>
                  {format(day, "EEE")}
                </div>
                <div className={cn("text-xl font-bold leading-tight", today ? "text-primary" : "text-foreground")}>
                  {format(day, "d")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {dailyTotal > 0 ? formatHours(dailyTotal) : "0h"}
                </div>
              </div>

              {/* Entries + drop zone */}
              <DroppableDay date={dateStr} locked={locked}>
                <div className="flex flex-col gap-1.5 p-2 min-h-[140px]">
                  {dayEntries.map((entry) => (
                    <DraggableEntry
                      key={entry.id}
                      entry={entry}
                      project={projectMap.get(entry.project_id)}
                      locked={locked || submitted}
                      onClick={() => onEntryClick(entry)}
                    />
                  ))}

                  {/* Add button */}
                  {!locked && !submitted && (
                    <button
                      onClick={() => onNewEntry(dateStr)}
                      className={cn(
                        "flex w-full items-center justify-center gap-1 rounded py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                        dayEntries.length === 0 && "mt-auto"
                      )}
                    >
                      <Plus className="h-3 w-3" /> New
                    </button>
                  )}
                </div>
              </DroppableDay>
            </div>
          );
        })}
      </div>
    </div>
  );
}
