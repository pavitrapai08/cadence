"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/hours";
import { PersonUtilisation } from "@/lib/types";

interface PersonRowProps {
  person: PersonUtilisation;
  weeks: string[];
}

function MiniBar({
  hours,
  capacity,
  weekLabel,
}: {
  hours: number;
  capacity: number;
  weekLabel: string;
}) {
  const pct = capacity > 0 ? (hours / capacity) * 100 : 0;
  const isOver = hours > capacity && capacity > 0;
  const isFull = !isOver && pct >= 75;

  return (
    <div
      className="relative h-9 w-4 rounded-sm bg-gray-100 overflow-hidden flex-shrink-0"
      title={`${weekLabel}: ${formatHours(hours)} / ${capacity}h capacity`}
    >
      <div
        className={cn(
          "absolute bottom-0 w-full transition-all",
          isOver
            ? "bg-amber-400"
            : isFull
            ? "bg-emerald-500"
            : "bg-emerald-400"
        )}
        style={{ height: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export function PersonRow({ person, weeks }: PersonRowProps) {
  const totalCapacity = person.capacityHours * weeks.length;
  const billablePct =
    person.totalLogged > 0
      ? Math.round((person.totalBillable / person.totalLogged) * 100)
      : 0;
  const isOvertime = person.totalLogged > totalCapacity;
  const displayName =
    person.fullName || person.email.split("@")[0];
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      {/* Avatar + name */}
      <div className="flex min-w-0 items-center gap-3 w-40 shrink-0">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #1B6B3A, #2D9A5A)" }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {displayName}
          </p>
          <p className="truncate text-[11px] text-gray-400 capitalize">
            {person.role}
          </p>
        </div>
      </div>

      {/* Weekly mini-bars — one per week */}
      <div className="flex flex-1 items-end justify-center gap-1 px-2">
        {weeks.map((wStart, i) => {
          const wd = person.weeklyData.find((w) => w.weekStart === wStart);
          return (
            <MiniBar
              key={wStart}
              hours={wd?.hours ?? 0}
              capacity={person.capacityHours}
              weekLabel={`Week ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Numeric stats */}
      <div className="hidden md:flex items-center gap-5 text-right shrink-0">
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              isOvertime ? "text-amber-600" : "text-gray-900"
            )}
          >
            {formatHours(person.totalLogged)}
          </p>
          <p className="text-[11px] text-gray-400">logged</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {formatHours(totalCapacity)}
          </p>
          <p className="text-[11px] text-gray-400">capacity</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{billablePct}%</p>
          <p className="text-[11px] text-gray-400">billable</p>
        </div>
      </div>

      {/* Submission status */}
      <div className="shrink-0">
        {person.submittedThisWeek ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Submitted
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-600">
            <Clock className="h-3 w-3" /> Pending
          </span>
        )}
      </div>
    </div>
  );
}
