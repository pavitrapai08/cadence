"use client";

import { useState } from "react";
import { ClipboardCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { HealthEntry } from "@/app/api/ai/health/route";

type CheckState = "idle" | "loading" | "done" | "error";

const ISSUE_LABEL: Record<string, string> = {
  no_note: "No note added",
  too_brief: "Note too brief (under 5 words)",
};

export function HealthCheck() {
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [entries, setEntries] = useState<HealthEntry[]>([]);

  async function runCheck() {
    setCheckState("loading");
    try {
      const res = await fetch("/api/ai/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        setCheckState("error");
        return;
      }
      setEntries(json.data as HealthEntry[]);
      setCheckState("done");
    } catch {
      setCheckState("error");
    }
  }

  const allGreen = entries.length > 0 && entries.every((e) => e.issue === "ok");
  const flagged = entries.filter((e) => e.issue !== "ok");

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Card header */}
      <div className="flex items-center gap-2 border-b border-gray-50 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
          <ClipboardCheck className="h-4 w-4 text-violet-500" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Ready to submit?</h2>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        {checkState === "idle" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-gray-400">
              Check your entries for missing or too-brief notes before submitting.
            </p>
            <button
              onClick={runCheck}
              className="flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 transition-colors"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Check my timesheet
            </button>
          </div>
        )}

        {checkState === "loading" && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </div>
        )}

        {checkState === "error" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-gray-400">Something went wrong. Please try again.</p>
            <button
              onClick={runCheck}
              className="flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {checkState === "done" && entries.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-gray-400">No entries this week to check.</p>
            <button
              onClick={() => setCheckState("idle")}
              className="text-xs text-violet-600 underline underline-offset-2 hover:text-violet-700"
            >
              Run again
            </button>
          </div>
        )}

        {checkState === "done" && entries.length > 0 && (
          <>
            {allGreen ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  Everything looks good — ready to submit ✓
                </span>
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 px-4 py-2.5">
                <p className="mb-2 text-xs font-semibold text-amber-700">
                  {flagged.length} entr{flagged.length === 1 ? "y needs" : "ies need"} attention
                </p>
                <div className="space-y-1.5">
                  {flagged.map((e) => (
                    <div key={e.entryId} className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-amber-800">
                          {format(parseISO(e.date), "EEE MMM d")} · {e.projectName}
                        </span>
                        <span className="ml-1.5 text-xs text-amber-600">
                          — {ISSUE_LABEL[e.issue] ?? e.issue}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full entry list */}
            <div className="mt-1 space-y-1">
              {entries.map((e) => (
                <div key={e.entryId} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      e.issue === "ok" ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-600">
                    {format(parseISO(e.date), "EEE MMM d")} · {e.projectName}
                  </span>
                  {e.issue !== "ok" && (
                    <span className="shrink-0 text-[10px] font-medium text-amber-500">
                      {e.issue === "no_note" ? "No note" : "Too brief"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={runCheck}
              className="mt-auto self-end text-xs text-gray-400 transition-colors hover:text-gray-600 underline underline-offset-2"
            >
              Re-check
            </button>
          </>
        )}
      </div>
    </div>
  );
}
