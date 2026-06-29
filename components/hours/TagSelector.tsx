"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, Search, X } from "lucide-react";
import { Tag } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  tags: Tag[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function TagSelector({ tags, selected, onChange, disabled }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const requiredTags = tags.filter((t) => t.is_required);
  const missingRequired = requiredTags.filter((t) => !selected.includes(t.id));
  const selectedTags = tags.filter((t) => selected.includes(t.id));
  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  function toggle(id: string) {
    if (disabled) return;
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  function removePill(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    onChange(selected.filter((s) => s !== id));
  }

  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground">No tags for this project.</p>;
  }

  const visiblePills = selectedTags.slice(0, 3);
  const extraCount = selectedTags.length - 3;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        role="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === "Enter" && !disabled && setOpen((o) => !o)}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex min-h-[38px] w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 cursor-pointer select-none",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          open && "ring-2 ring-ring"
        )}
      >
        {selectedTags.length === 0 && (
          <span className="text-sm text-muted-foreground">Choose tags…</span>
        )}
        {visiblePills.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            {tag.name}
            {!disabled && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => removePill(tag.id, e)}
                className="ml-0.5 rounded-full hover:text-destructive"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
        {extraCount > 0 && (
          <span className="text-xs text-muted-foreground">+{extraCount} more</span>
        )}
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {filteredTags.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No tags found.</p>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selected.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggle(tag.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                      isSelected && "text-primary"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isSelected ? "bg-primary border-primary" : "border-input"
                      )}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {tag.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {missingRequired.length > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          {missingRequired.map((t) => t.name).join(", ")} is required — please select it.
        </p>
      )}
    </div>
  );
}
