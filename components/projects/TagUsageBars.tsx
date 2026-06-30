"use client";

import { formatHours } from "@/lib/hours";

interface TagUsageBarsProps {
  tagUsage: { tagId: string; tagName: string; hours: number }[];
  projectColour: string;
}

export function TagUsageBars({ tagUsage, projectColour }: TagUsageBarsProps) {
  if (tagUsage.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No tag data yet — add tags when logging entries.
      </p>
    );
  }

  const max = tagUsage[0].hours;

  return (
    <div className="space-y-2.5">
      {tagUsage.map((tag) => {
        const pct = max > 0 ? (tag.hours / max) * 100 : 0;
        return (
          <div key={tag.tagId} className="flex items-center gap-3">
            <span className="w-[160px] shrink-0 truncate text-xs text-gray-700">{tag.tagName}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: projectColour }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-gray-500">
              {formatHours(tag.hours)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
