"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, Loader2, BarChart3, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { formatHours } from "@/lib/hours";
import { ClientReportRow } from "@/lib/types";
import { ExportButton, ExportColumn } from "./ExportButton";

function WeekHeader({ weeks }: { weeks: string[] }) {
  return (
    <>
      {weeks.map((w) => (
        <th
          key={w}
          className="whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-medium text-gray-400"
        >
          {format(parseISO(w), "MMM d")}
        </th>
      ))}
      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-600">
        Total
      </th>
    </>
  );
}

function ClientRowGroup({
  client,
  weeks,
}: {
  client: ClientReportRow;
  weeks: string[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      {/* Client header row */}
      <tr
        className="cursor-pointer bg-gray-50 hover:bg-gray-100/80 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="sticky left-0 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-800">
          <span className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            )}
            {client.clientName}
          </span>
        </td>
        {weeks.map((w) => (
          <td key={w} className="px-3 py-2.5 text-right text-xs font-medium text-gray-600">
            {client.projects.reduce((s, p) => s + (p.weeklyHours[w] ?? 0), 0) > 0
              ? formatHours(
                  client.projects.reduce((s, p) => s + (p.weeklyHours[w] ?? 0), 0)
                )
              : <span className="text-gray-300">—</span>}
          </td>
        ))}
        <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-800">
          {formatHours(client.totalHours)}
        </td>
      </tr>

      {/* Project rows */}
      {expanded &&
        client.projects.map((project) => (
          <tr
            key={project.projectId}
            className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
          >
            <td className="sticky left-0 bg-white pl-10 pr-4 py-2 text-xs text-gray-600">
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: project.colour }}
                />
                {project.projectName}
              </span>
            </td>
            {weeks.map((w) => (
              <td key={w} className="px-3 py-2 text-right text-xs text-gray-500">
                {project.weeklyHours[w]
                  ? formatHours(project.weeklyHours[w])
                  : <span className="text-gray-200">—</span>}
              </td>
            ))}
            <td className="px-3 py-2 text-right text-xs font-medium text-gray-700">
              {formatHours(project.totalHours)}
            </td>
          </tr>
        ))}
    </>
  );
}

function buildExportRows(clients: ClientReportRow[], weeks: string[]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const c of clients) {
    for (const p of c.projects) {
      const row: Record<string, unknown> = {
        client: c.clientName,
        project: p.projectName,
        externalId: p.externalId ?? "",
        total: p.totalHours,
      };
      for (const w of weeks) {
        row[format(parseISO(w), "MMM d")] = p.weeklyHours[w] ?? 0;
      }
      rows.push(row);
    }
  }
  return rows;
}

function buildExportColumns(weeks: string[]): ExportColumn[] {
  return [
    { key: "client", label: "Client" },
    { key: "project", label: "Project" },
    { key: "externalId", label: "External ID" },
    ...weeks.map((w) => ({ key: format(parseISO(w), "MMM d"), label: format(parseISO(w), "MMM d") })),
    { key: "total", label: "Total Hours" },
  ];
}

export function ClientReport() {
  const [clients, setClients] = useState<ClientReportRow[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [cappedNote, setCappedNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/reports/clients");
      const json = await res.json();
      if (!res.ok) {
        setFetchError(json.error?.message ?? "Failed to load report.");
        toast.error(json.error?.message ?? "Failed to load report.");
        return;
      }
      setClients(json.data.clients);
      setWeeks(json.data.weeks);
      setCappedNote(json.data.cappedNote ?? null);
    } catch {
      setFetchError("Something went wrong.");
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportRows = buildExportRows(clients, weeks);
  const exportColumns = buildExportColumns(weeks);
  const totalHours = clients.reduce((s, c) => s + c.totalHours, 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="-mx-4 -mt-4 mb-6 md:-mx-6 md:-mt-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-50/70 via-emerald-50/40 to-[#F8FAFB] px-4 py-7 md:px-6">
          <div className="pointer-events-none absolute right-20 top-5 h-3 w-3 rounded-full bg-violet-300/40" />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Clients & Projects</h1>
          <p className="mt-1.5 text-sm text-gray-500">Hours by client and project — last 12 weeks</p>
        </div>
      </div>

      {/* Summary + export bar */}
      {!loading && clients.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-5 text-sm">
            <span className="text-gray-500">
              <span className="font-semibold text-gray-900">{clients.length}</span> client{clients.length !== 1 ? "s" : ""}
            </span>
            <span className="text-gray-500">
              <span className="font-semibold text-gray-900">
                {clients.reduce((s, c) => s + c.projects.length, 0)}
              </span> projects
            </span>
            <span className="text-gray-500">
              <span className="font-semibold text-gray-900">{formatHours(totalHours)}</span> total
            </span>
          </div>
          <ExportButton
            rows={exportRows}
            columns={exportColumns}
            filename="cadence-clients-report"
          />
        </div>
      )}

      {cappedNote && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600">
          <Info className="h-3.5 w-3.5" /> {cappedNote}
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : fetchError ? (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/50 py-12 text-center">
          <p className="text-sm text-red-600">{fetchError}</p>
          <button onClick={fetchData} className="mt-2 text-xs text-red-500 underline">Retry</button>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <BarChart3 className="mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No hours logged in this period</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="sticky left-0 bg-white px-4 py-2.5 text-[11px] font-medium text-gray-400 min-w-[200px]">
                  Client / Project
                </th>
                <WeekHeader weeks={weeks} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((c) => (
                <ClientRowGroup key={c.clientId} client={c} weeks={weeks} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
