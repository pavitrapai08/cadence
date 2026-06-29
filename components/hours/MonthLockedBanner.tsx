import { Lock } from "lucide-react";

interface MonthLockedBannerProps {
  label: string; // e.g. "June 2026"
}

export function MonthLockedBanner({ label }: MonthLockedBannerProps) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <Lock className="h-4 w-4 shrink-0" />
      <span>
        <strong>{label}</strong> is locked. Contact your admin to unlock it.
      </span>
    </div>
  );
}
