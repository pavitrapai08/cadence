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
    <div className="space-y-3">
      {lockedBanners.map((b) => (
        <MonthLockedBanner key={b.key} label={b.label} />
      ))}

      {/* Calendar grid — individual day cards with gaps */}
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
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
                "flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white transition-all",
                today
                  ? "border-primary/30 shadow-[0_2px_16px_rgba(27,107,58,0.12)]"
                  : "border-gray-100 shadow-sm hover:shadow-md"
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  "select-none border-b px-4 py-3",
                  today
                    ? "border-primary/20 bg-gradient-to-br from-green-50 to-white"
                    : "border-gray-100 bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                      {format(day, "EEE")}
                    </div>
                    <div className={cn(
                      "mt-0.5 text-[28px] font-light leading-none",
                      today ? "text-primary" : "text-[#111]"
                    )}>
                      {format(day, "d")}
                    </div>
                  </div>
                  {dailyTotal > 0 && (
                    <span className="mt-0.5 text-xs text-[#9CA3AF] tabular-nums">
                      {formatHours(dailyTotal)}
                    </span>
                  )}
                </div>
              </div>

              {/* Entries + drop zone */}
              <DroppableDay date={dateStr} locked={locked}>
                <div className="flex min-h-[260px] flex-col gap-1.5 p-2">
                  {dayEntries.map((entry) => (
                    <DraggableEntry
                      key={entry.id}
                      entry={entry}
                      project={projectMap.get(entry.project_id)}
                      locked={locked || submitted}
                      onClick={() => onEntryClick(entry)}
                    />
                  ))}

                  {/* New entry button */}
                  {!locked && !submitted && (
                    <button
                      onClick={() => onNewEntry(dateStr)}
                      className={cn(
                        "group flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-muted-foreground/60 transition-all hover:text-primary",
                        dayEntries.length === 0
                          ? "mt-1 border border-dashed border-border hover:border-primary/40 hover:bg-primary/5"
                          : "hover:bg-primary/5"
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className={cn(dayEntries.length === 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                        New
                      </span>
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
