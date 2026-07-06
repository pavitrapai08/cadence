"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { weekStart, weekStartISO, shiftWeek } from "@/lib/week";
import { PersonUtilisation } from "@/lib/types";
import { UtilisationChart } from "./UtilisationChart";
import { PersonRow } from "./PersonRow";

type RangePreset = "4w" | "8w" | "12w";
type FilterMode = "all" | "missing" | "overtime";

const RANGE_LABELS: Record<RangePreset, string> = {
  "4w": "4 weeks",
  "8w": "8 weeks",
  "12w": "12 weeks",
};

function buildRange(preset: RangePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const cur = weekStart(now);
  const weeksBack = preset === "4w" ? 3 : preset === "8w" ? 7 : 11;
  return {
    dateFrom: weekStartISO(shiftWeek(cur, -weeksBack)),
    dateTo: weekStartISO(shiftWeek(cur, 1)),
  };
}

interface PeopleShellProps {
  role: string;
}

export function PeopleShell({ role }: PeopleShellProps) {
  const [rangePreset, setRangePreset] = useState<RangePreset>("4w");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [users, setUsers] = useState<PersonUtilisation[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async (preset: RangePreset) => {
    setLoading(true);
    setFetchError(null);
    try {
      const { dateFrom, dateTo } = buildRange(preset);
      const res = await fetch(
        `/api/reports/people?dateFrom=${dateFrom}&dateTo=${dateTo}`
      );
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.error?.message ?? "Failed to load People data.");
        toast.error(json.error?.message ?? "Failed to load People data.");
        return;
      }
      setUsers(json.data.users);
      setWeeks(json.data.weeks);
    } catch {
      setFetchError("Something went wrong.");
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(rangePreset);
  }, [rangePreset, fetchData]);

  const displayed = users.filter((u) => {
    if (filterMode === "missing") {
      const totalCapacity = u.capacityHours * weeks.length;
      return !u.hasLoggedToday || u.totalLogged < totalCapacity * 0.5;
    }
    if (filterMode === "overtime") {
      return u.totalLogged > u.capacityHours * weeks.length;
    }
    return true;
  });

  const submittedCount = users.filter((u) => u.submittedThisWeek).length;

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
            <h1 className="text-2xl font-bold tracking-tight text-white">People</h1>
            <p className="mt-1.5 text-sm" style={{ color: "rgba(167,243,208,0.75)" }}>
              {users.length} team member{users.length !== 1 ? "s" : ""} ·{" "}
              {submittedCount} submitted this week
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg bg-muted p-0.5 text-sm">
          {(["all", "missing", "overtime"] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterMode(f)}
              className={cn(
                "rounded-md px-3 py-1 font-medium capitalize transition-all",
                filterMode === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "missing" ? "Missing hours" : f === "overtime" ? "Overtime" : "All"}
            </button>
          ))}
        </div>
        <div className="flex items-center rounded-lg bg-muted p-0.5 text-sm ml-auto">
          {(["4w", "8w", "12w"] as RangePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setRangePreset(p)}
              className={cn(
                "rounded-md px-3 py-1 font-medium transition-all",
                rangePreset === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {RANGE_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Team utilisation chart */}
      {!loading && users.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Team utilisation — {RANGE_LABELS[rangePreset]}
          </h2>
          <UtilisationChart weeks={weeks} users={users} />
          <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#1B6B3A]" /> Billable
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#D1FAE5] border border-emerald-200" /> Non-billable
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-px w-5 border-t-2 border-dashed border-gray-300" /> Capacity
            </span>
          </div>
        </div>
      )}

      {/* Person rows */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : fetchError ? (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/50 py-12 text-center">
          <p className="text-sm text-red-600">{fetchError}</p>
          <button onClick={() => fetchData(rangePreset)} className="mt-2 text-xs text-red-500 underline">
            Retry
          </button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <Users className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {filterMode === "missing"
              ? "No team members with missing hours"
              : filterMode === "overtime"
              ? "No team members over capacity"
              : role === "manager"
              ? "No team members assigned to you yet"
              : "No team members found"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((person) => (
            <PersonRow key={person.userId} person={person} weeks={weeks} />
          ))}
        </div>
      )}
    </div>
  );
}
