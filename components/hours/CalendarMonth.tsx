"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isSameMonth,
  getDay,
} from "date-fns";
import { formatHours } from "@/lib/hours";
import { isMonthLocked } from "@/lib/month-lock";
import { TimeEntry, Project } from "@/lib/types";
import { MonthLockedBanner } from "./MonthLockedBanner";
import { Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarMonthProps {
  monthDate: Date;
  entries: TimeEntry[];
  projects: Project[];
  lockedMonths: Set<string>;
  onNewEntry: (date: string) => void;
  onEntryClick: (entry: TimeEntry) => void;
}

const DAY_HEADERS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function CalendarMonth({
  monthDate,
  entries,
  projects,
  lockedMonths,
  onNewEntry,
  onEntryClick,
}: CalendarMonthProps) {
  const [search, setSearch] = useState("");

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const monthLocked = isMonthLocked(monthDate, lockedMonths);

  const byDate = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    const q = search.toLowerCase();
    for (const e of entries) {
      if (q) {
        const proj = projectMap.get(e.project_id)?.name?.toLowerCase() ?? "";
        const note = (e.ai_description ?? e.raw_notes ?? "").toLowerCase();
        if (!proj.includes(q) && !note.includes(q)) continue;
      }
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [entries, search, projectMap]);

  const days = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  });

  // ISO Monday-start: getDay() returns 0=Sun…6=Sat, remap to 0=Mon…6=Sun
  const leadingBlanks = (getDay(days[0]) + 6) % 7;

  return (
    <div className="space-y-3">
      {monthLocked && <MonthLockedBanner label={format(monthDate, "MMMM yyyy")} />}

      <input
        type="text"
        placeholder="Search by project or note…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-lg border border-border">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="border-r border-border bg-muted/30 px-2 py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0"
            >
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="grid grid-cols-7">
          {/* Leading blanks */}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`b-${i}`} className="border-b border-r border-border bg-muted/10 min-h-[90px] last:border-r-0" />
          ))}

          {days.map((day, idx) => {
            const col = (leadingBlanks + idx) % 7;
            const dateStr = format(day, "yyyy-MM-dd");
            const dayEntries = byDate.get(dateStr) ?? [];
            const locked = isMonthLocked(day, lockedMonths);
            const inMonth = isSameMonth(day, monthDate);
            const total = dayEntries.reduce((s, e) => s + e.hours, 0);
            const today = isToday(day);

            return (
              <div
                key={dateStr}
                className={cn(
                  "group relative min-h-[90px] border-b border-r border-border p-2 last:border-r-0",
                  col === 6 && "border-r-0",
                  inMonth && !locked && "cursor-pointer hover:bg-accent/30",
                  !inMonth && "opacity-40 bg-muted/10",
                  today && "bg-primary/5"
                )}
                onClick={() => !locked && inMonth && onNewEntry(dateStr)}
              >
                {/* Date + hours */}
                <div className="flex items-start justify-between mb-1">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      today &&
                        "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex items-center gap-1">
                    {total > 0 && (
                      <span className="text-[11px] font-medium text-primary">
                        {formatHours(total)}
                      </span>
                    )}
                    {locked && <Lock className="h-2.5 w-2.5 text-amber-400" />}
                  </div>
                </div>

                {/* Entry chips */}
                <div className="space-y-0.5">
                  {dayEntries.slice(0, 3).map((e) => {
                    const proj = projectMap.get(e.project_id);
                    return (
                      <div
                        key={e.id}
                        onClick={(ev) => { ev.stopPropagation(); onEntryClick(e); }}
                        title={proj?.name}
                        className="truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-white cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: proj?.colour ?? "#94a3b8" }}
                      >
                        {proj?.name}
                      </div>
                    );
                  })}
                  {dayEntries.length > 3 && (
                    <div className="text-[11px] text-muted-foreground pl-1">
                      +{dayEntries.length - 3} more
                    </div>
                  )}
                </div>

                {/* Hover "New Entry" button */}
                {!locked && inMonth && dayEntries.length === 0 && (
                  <button
                    onClick={(ev) => { ev.stopPropagation(); onNewEntry(dateStr); }}
                    className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" /> New Entry
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
