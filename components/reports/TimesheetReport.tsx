"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, FileText, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatHours } from "@/lib/hours";
import { TimesheetEntryRow, TimesheetReportSummary } from "@/lib/types";
import { ExportButton, ExportColumn } from "./ExportButton";

const STATUS_STYLES = {
  submitted: "bg-emerald-50 text-emerald-700",
  draft: "bg-amber-50 text-amber-600",
};

function StatusBadge({ status }: { status: "draft" | "submitted" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
        STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

function buildExportRows(
  entries: TimesheetEntryRow[],
  showUser: boolean
): Record<string, unknown>[] {
  return entries.map((e) => {
    const row: Record<string, unknown> = {
      date: e.date,
      project: e.projectName,
      hours: e.hours,
      note: e.note ?? "",
      tags: e.tagNames.join(", "),
      status: e.status,
    };
    if (showUser) row.user = e.userFullName ?? e.userEmail;
    return row;
  });
}

function buildExportColumns(showUser: boolean): ExportColumn[] {
  const cols: ExportColumn[] = [{ key: "date", label: "Date" }];
  if (showUser) cols.push({ key: "user", label: "User" });
  cols.push(
    { key: "project", label: "Project" },
    { key: "hours", label: "Hours" },
    { key: "note", label: "Note" },
    { key: "tags", label: "Tags" },
    { key: "status", label: "Status" }
  );
  return cols;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  status: string;
  projectId: string;
}

export function TimesheetReport() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const nextMonth = new Date(y, now.getMonth() + 1, 1);

  const [filters, setFilters] = useState<Filters>({
    dateFrom: `${y}-${m}-01`,
    dateTo: nextMonth.toISOString().slice(0, 10),
    status: "",
    projectId: "",
  });
  const [entries, setEntries] = useState<TimesheetEntryRow[]>([]);
  const [summary, setSummary] = useState<TimesheetReportSummary | null>(null);
  const [role, setRole] = useState<string>("employee");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async (f: Filters) => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
        ...(f.status && { status: f.status }),
        ...(f.projectId && { projectId: f.projectId }),
      });
      const res = await fetch(`/api/reports/timesheets?${params}`);
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.error?.message ?? "Failed to load report.");
        toast.error(json.error?.message ?? "Failed to load report.");
        return;
      }
      setEntries(json.data.entries);
      setSummary(json.data.summary);
      setRole(json.data.role ?? "employee");
    } catch {
      setFetchError("Something went wrong.");
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(filters); }, [filters, fetchData]);

  const showUser = role !== "employee";
  const exportRows = buildExportRows(entries, showUser);
  const exportColumns = buildExportColumns(showUser);

  function updateFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="-mx-4 -mt-4 mb-6 md:-mx-6 md:-mt-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-50/80 via-emerald-50/40 to-[#F8FAFB] px-4 py-7 md:px-6">
          <div className="pointer-events-none absolute right-20 top-5 h-3 w-3 rounded-full bg-slate-300/40" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Timesheets</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {showUser ? "Your team's time entries" : "Your time entries"}
          </p>
        </div>
      </div>

      {/* Role context banner */}
      {showUser && (
        <div className="rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          Showing entries for your {role === "admin" ? "entire organisation" : "team"}.
          {" "}Employees see only their own entries without the User column.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => updateFilter("dateFrom", e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => updateFilter("dateTo", e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="h-9 appearance-none rounded-lg border border-border bg-background pl-3 pr-8 text-sm outline-none focus:border-primary"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Summary + export bar */}
      {!loading && summary && entries.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-5 text-sm">
            {[
              { label: "entries", value: summary.entryCount },
              ...(showUser ? [{ label: "people", value: summary.peopleCount }] : []),
              { label: "projects", value: summary.projectCount },
            ].map(({ label, value }) => (
              <span key={label} className="text-gray-500">
                <span className="font-semibold text-gray-900">{value}</span> {label}
              </span>
            ))}
            <span className="text-gray-500">
              <span className="font-semibold text-gray-900">{formatHours(summary.totalHours)}</span> total
            </span>
          </div>
          <ExportButton
            rows={exportRows}
            columns={exportColumns}
            filename="cadence-timesheets"
          />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : fetchError ? (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/50 py-12 text-center">
          <p className="text-sm text-red-600">{fetchError}</p>
          <button onClick={() => fetchData(filters)} className="mt-2 text-xs text-red-500 underline">Retry</button>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <FileText className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No entries found for this period</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[540px] text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 w-28">Date</th>
                {showUser && <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400">User</th>}
                <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400">Project</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 w-16 text-right">Hours</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 hidden md:table-cell">Note</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 hidden lg:table-cell">Tags</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-gray-400 w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {format(parseISO(e.date), "MMM d, yyyy")}
                  </td>
                  {showUser && (
                    <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[140px] truncate">
                      {e.userFullName ?? e.userEmail.split("@")[0]}
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: e.projectColour }}
                      />
                      <span className="truncate max-w-[180px]">{e.projectName}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-medium text-gray-900">
                    {formatHours(e.hours)}
                  </td>
                  <td className="hidden md:table-cell px-4 py-2.5 text-xs text-gray-500 max-w-[240px] truncate">
                    {e.note ?? <span className="text-gray-300 italic">no note</span>}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-2.5 text-xs text-gray-400 max-w-[160px] truncate">
                    {e.tagNames.join(", ") || <span className="text-gray-200">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
