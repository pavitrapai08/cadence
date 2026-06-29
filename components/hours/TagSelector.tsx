"use client";

import { Tag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface TagSelectorProps {
  tags: Tag[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function TagSelector({ tags, selected, onChange, disabled }: TagSelectorProps) {
  const requiredTags = tags.filter((t) => t.is_required);
  const missingRequired = requiredTags.filter((t) => !selected.includes(t.id));

  function toggle(id: string) {
    if (disabled) return;
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  }

  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground">No tags for this project.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => {
          const isSelected = selected.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tag.id)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-accent",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
      {missingRequired.length > 0 && (
        <p className="flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          {missingRequired.map((t) => t.name).join(", ")} is required — please select it.
        </p>
      )}
    </div>
  );
}
