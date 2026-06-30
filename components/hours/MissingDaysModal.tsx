"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface MissingDaysModalProps {
  missingDays: Date[];
  onGoBack: () => void;
  onSubmitAnyway: () => void;
  submitting?: boolean;
}

export function MissingDaysModal({
  missingDays,
  onGoBack,
  onSubmitAnyway,
  submitting,
}: MissingDaysModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onGoBack}
    >
      <div
        className="w-[420px] max-w-[95vw] overflow-hidden rounded-2xl bg-white shadow-[0_25px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amber header */}
        <div className="flex items-start gap-3 bg-amber-50 px-6 py-5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Missing hours
            </h2>
            <p className="mt-0.5 text-sm text-gray-600">
              You haven&apos;t logged hours for the following day
              {missingDays.length !== 1 ? "s" : ""}:
            </p>
          </div>
        </div>

        {/* Day pills */}
        <div className="flex flex-wrap gap-2 px-6 py-4">
          {missingDays.map((day) => (
            <span
              key={day.toISOString()}
              className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800"
            >
              {format(day, "EEEE, MMM d")}
            </span>
          ))}
        </div>

        <p className="px-6 pb-2 text-sm text-gray-500">
          Submit anyway? This action cannot be undone.
        </p>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="outline" onClick={onGoBack} disabled={submitting}>
            Go back
          </Button>
          <button
            onClick={onSubmitAnyway}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#1B6B3A" }}
          >
            {submitting ? "Submitting…" : "Submit anyway"}
          </button>
        </div>
      </div>
    </div>
  );
}
