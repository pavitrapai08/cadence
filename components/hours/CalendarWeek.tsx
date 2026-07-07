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
          const dailyTotal = dayEntries.reduce((s, e) => s + e.hours, 0);
          const today = isToday(day);

          return (
            <div
              key={dateStr}
              className={cn(
                "group flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white",
                "transition-all duration-200 ease-out",
                "hover:-translate-y-2 hover:scale-[1.015]",
                today
                  ? [
                      "border-primary/30",
                      "shadow-[0_2px_16px_rgba(27,107,58,0.12)]",
                      "hover:shadow-[0_20px_56px_rgba(27,107,58,0.22)]",
                      "hover:border-primary/50",
                    ].join(" ")
                  : [
                      "border-gray-100",
                      "shadow-[0_1px_4px_rgba(0,0,0,0.06)]",
                      "hover:shadow-[0_20px_48px_rgba(0,0,0,0.13)]",
                      "hover:border-primary/25",
                    ].join(" ")
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  "select-none border-b px-4 py-3 transition-colors duration-200",
                  today
                    ? "border-primary/20 bg-gradient-to-br from-green-50 to-white group-hover:from-green-100/60"
                    : "border-gray-100 bg-white group-hover:bg-gray-50/60"
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                      {format(day, "EEE")}
                    </div>
                    <div className={cn(
                      "mt-0.5 text-[32px] font-light leading-none transition-colors duration-200",
                      today ? "text-primary" : "text-[#111] group-hover:text-primary"
                    )}>
                      {format(day, "d")}
                    </div>
                  </div>
                  {dailyTotal > 0 && (
                    <span className="mt-0.5 rounded-full bg-primary/8 px-2 py-0.5 text-xs font-medium text-primary tabular-nums">
                      {formatHours(dailyTotal)}
                    </span>
                  )}
                </div>
              </div>

              {/* Entries + drop zone */}
              <DroppableDay date={dateStr} locked={locked}>
                <div className="flex min-h-[520px] flex-col gap-1.5 p-2">
                  {dayEntries.map((entry) => (
                    <DraggableEntry
                      key={entry.id}
                      entry={entry}
                      project={projectMap.get(entry.project_id)}
                      locked={locked}
                      onClick={() => onEntryClick(entry)}
                    />
                  ))}

                  {/* New entry button */}
                  {!locked && (
                    <button
                      onClick={() => onNewEntry(dateStr)}
                      className={cn(
                        "group/btn flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-all duration-150",
                        "text-muted-foreground/50 hover:text-primary",
                        dayEntries.length === 0
                          ? "mt-1 border border-dashed border-gray-200 hover:border-primary/40 hover:bg-primary/5"
                          : "hover:bg-primary/5"
                      )}
                    >
                      <Plus className="h-3.5 w-3.5 transition-transform duration-150 group-hover/btn:scale-110" />
                      <span className={cn(dayEntries.length === 0 ? "opacity-100" : "opacity-0 group-hover/btn:opacity-100")}>
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
