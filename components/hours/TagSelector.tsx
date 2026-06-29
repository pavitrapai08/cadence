"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, Search, X } from "lucide-react";
import { Tag } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  tags: Tag[];
  /** Single-select: array will always have 0 or 1 item. */
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function TagSelector({ tags, selected, onChange, disabled }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedId = selected[0] ?? null;
  const selectedTag = tags.find((t) => t.id === selectedId) ?? null;
  const requiredTags = tags.filter((t) => t.is_required);
  const missingRequired = requiredTags.filter((t) => t.id !== selectedId);
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

  function select(id: string) {
    if (disabled) return;
    // Clicking the already-selected tag deselects it
    onChange(selectedId === id ? [] : [id]);
    setOpen(false);
    setSearch("");
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled) return;
    onChange([]);
  }

  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground">No tags for this project.</p>;
  }

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
          "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 cursor-pointer select-none",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          open && "ring-2 ring-ring"
        )}
      >
        {selectedTag ? (
          <>
            <span className="flex-1 truncate text-sm">{selectedTag.name}</span>
            {!disabled && (
              <button
                type="button"
                tabIndex={-1}
                onClick={clear}
                className="shrink-0 rounded text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        ) : (
          <span className="flex-1 text-sm text-muted-foreground">Choose a tag…</span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
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
          <div className="max-h-[220px] overflow-y-auto py-1">
            {filteredTags.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No tags found.</p>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = tag.id === selectedId;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => select(tag.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-accent",
                      isSelected && "text-primary font-medium"
                    )}
                  >
                    {/* Radio circle */}
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-input"
                      )}
                    >
                      {isSelected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </span>
                    {tag.name}
                    {tag.is_required && !isSelected && (
                      <span className="ml-auto text-[10px] text-amber-500 font-medium">Required</span>
                    )}
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
