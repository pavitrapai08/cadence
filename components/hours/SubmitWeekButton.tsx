"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { weekdaysMonFri, weekStartISO } from "@/lib/week";
import { MissingDaysModal } from "./MissingDaysModal";
import { TimeEntry } from "@/lib/types";

interface SubmitWeekButtonProps {
  weekStart: Date;
  entries: TimeEntry[];
  onSubmitted: () => void;
}

export function SubmitWeekButton({
  weekStart,
  entries,
  onSubmitted,
}: SubmitWeekButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function getMissingDays(): Date[] {
    const entryDates = new Set(entries.map((e) => e.date));
    return weekdaysMonFri(weekStart).filter(
      (d) => !entryDates.has(format(d, "yyyy-MM-dd"))
    );
  }

  function handleClick() {
    const missing = getMissingDays();
    if (missing.length > 0) {
      setShowModal(true);
    } else {
      doSubmit();
    }
  }

  async function doSubmit() {
    setShowModal(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: weekStartISO(weekStart) }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to submit timesheet.");
        return;
      }
      toast.success("Week submitted successfully.");
      onSubmitted();
    } catch {
      toast.error("Submit failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={submitting}
        className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "#1B6B3A" }}
      >
        <Send className="h-3.5 w-3.5" />
        {submitting ? "Submitting…" : "Submit week"}
      </button>

      {showModal && (
        <MissingDaysModal
          missingDays={getMissingDays()}
          submitting={submitting}
          onGoBack={() => setShowModal(false)}
          onSubmitAnyway={doSubmit}
        />
      )}
    </>
  );
}
