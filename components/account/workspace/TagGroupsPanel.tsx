"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Plus, Loader2, Tag } from "lucide-react";

interface TagRow {
  id: string;
  name: string;
  is_billable: boolean;
  is_required: boolean;
}

interface TagGroup {
  id: string;
  name: string;
  tags: TagRow[];
}

export function TagGroupsPanel() {
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [newTagName, setNewTagName] = useState<Record<string, string>>({});
  const [addingTag, setAddingTag] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [groupsRes] = await Promise.all([
        fetch("/api/admin/tag-groups").then((r) => r.json()),
      ]);
      const rawGroups: { id: string; name: string }[] = groupsRes.data ?? [];
      // Fetch tags for each group
      const withTags = await Promise.all(
        rawGroups.map(async (g) => {
          const r = await fetch(`/api/admin/tags?tagGroupId=${g.id}`);
          const j = await r.json();
          return { ...g, tags: (j.data ?? []) as TagRow[] };
        })
      );
      setGroups(withTags);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addGroup() {
    if (!newGroupName.trim()) return;
    setAddingGroup(true);
    try {
      const res = await fetch("/api/admin/tag-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed."); return; }
      setGroups((prev) => [...prev, { ...json.data, tags: [] }]);
      setNewGroupName("");
      toast.success("Tag group created.");
    } catch { toast.error("Something went wrong."); }
    finally { setAddingGroup(false); }
  }

  async function addTag(groupId: string) {
    const name = (newTagName[groupId] ?? "").trim();
    if (!name) return;
    setAddingTag(groupId);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tagGroupId: groupId, isBillable: true, isRequired: false }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed."); return; }
      setGroups((prev) =>
        prev.map((g) => g.id === groupId ? { ...g, tags: [...g.tags, json.data] } : g)
      );
      setNewTagName((prev) => ({ ...prev, [groupId]: "" }));
      toast.success("Tag added.");
    } catch { toast.error("Something went wrong."); }
    finally { setAddingTag(null); }
  }

  async function patchTag(groupId: string, tagId: string, patch: Partial<TagRow>) {
    try {
      const res = await fetch(`/api/admin/tags?tagId=${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed."); return; }
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, tags: g.tags.map((t) => (t.id === tagId ? json.data : t)) }
            : g
        )
      );
    } catch { toast.error("Something went wrong."); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading tag groups…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add group */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addGroup()}
          placeholder="New tag group name…"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-[#1B6B3A]"
        />
        <button
          onClick={addGroup}
          disabled={addingGroup || !newGroupName.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-[#1B6B3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#155530] transition-colors disabled:opacity-60"
        >
          {addingGroup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add group
        </button>
      </div>

      {/* Groups */}
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => toggleExpand(g.id)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              {expanded.has(g.id) ? (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              )}
              <Tag className="h-3.5 w-3.5 text-[#1B6B3A]" />
              <span className="flex-1 text-sm font-semibold text-gray-800">{g.name}</span>
              <span className="text-xs text-gray-400">{g.tags.length} tags</span>
            </button>

            {expanded.has(g.id) && (
              <div className="border-t border-gray-50 px-4 py-3 space-y-2">
                {g.tags.map((t) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <span className="flex-1 text-xs text-gray-700">{t.name}</span>
                    <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.is_billable}
                        onChange={(e) => patchTag(g.id, t.id, { is_billable: e.target.checked })}
                        className="accent-[#1B6B3A]"
                      />
                      Billable
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.is_required}
                        onChange={(e) => patchTag(g.id, t.id, { is_required: e.target.checked })}
                        className="accent-amber-500"
                      />
                      Required
                    </label>
                  </div>
                ))}

                {/* Add tag */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newTagName[g.id] ?? ""}
                    onChange={(e) =>
                      setNewTagName((prev) => ({ ...prev, [g.id]: e.target.value }))
                    }
                    onKeyDown={(e) => e.key === "Enter" && addTag(g.id)}
                    placeholder="New tag…"
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-[#1B6B3A]"
                  />
                  <button
                    onClick={() => addTag(g.id)}
                    disabled={addingTag === g.id || !(newTagName[g.id] ?? "").trim()}
                    className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-60"
                  >
                    {addingTag === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Add tag
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
