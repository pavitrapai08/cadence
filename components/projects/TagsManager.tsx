"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  is_billable: boolean;
  is_required: boolean;
}

interface TagsManagerProps {
  tagGroupId: string;
}

export function TagsManager({ tagGroupId }: TagsManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBillable, setNewBillable] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setTags([]);
    if (!tagGroupId) return;
    setLoading(true);
    fetch(`/api/admin/tags?tagGroupId=${tagGroupId}`)
      .then((r) => r.json())
      .then((j) => setTags(j.data ?? []))
      .catch(() => toast.error("Failed to load tags."))
      .finally(() => setLoading(false));
  }, [tagGroupId]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), tagGroupId, isBillable: newBillable }),
      });
      const json = await res.json();
      if (res.ok) {
        setTags((prev) => [...prev, json.data]);
        setNewName("");
        setNewBillable(true);
        toast.success("Tag added.");
      } else {
        toast.error(json.error?.message ?? "Failed to add tag.");
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
        Tags in this group {loading ? "…" : `(${tags.length})`}
      </p>

      {loading && (
        <div className="flex items-center gap-2 py-1">
          <Loader2 className="h-3 w-3 animate-spin text-gray-300" />
          <span className="text-xs text-gray-400">Loading…</span>
        </div>
      )}

      {!loading && tags.length > 0 && (
        <div className="max-h-[130px] overflow-y-auto space-y-1 pr-1">
          {tags.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-xs text-gray-700">{t.name}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  t.is_billable
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {t.is_billable ? "Billable" : "Non-billable"}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && tags.length === 0 && (
        <p className="text-xs text-gray-400 italic">No tags yet — add one below.</p>
      )}

      {/* Add new tag row */}
      <div className="flex gap-1.5 border-t border-gray-100 pt-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Tag name"
          className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setNewBillable((b) => !b)}
          className={cn(
            "shrink-0 rounded border px-2 py-1 text-[10px] font-medium transition-colors",
            newBillable
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-gray-200 bg-gray-100 text-gray-500"
          )}
        >
          {newBillable ? "Billable" : "Non-billable"}
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newName.trim() || adding}
          className="flex shrink-0 items-center gap-1 rounded bg-gray-900 px-2 py-1 text-[10px] text-white disabled:opacity-40"
        >
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}
