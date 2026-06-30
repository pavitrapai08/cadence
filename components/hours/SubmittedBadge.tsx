"use client";

import { CheckCircle2 } from "lucide-react";

export function SubmittedBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      Submitted ✓
    </div>
  );
}
