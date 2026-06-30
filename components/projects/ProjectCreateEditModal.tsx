"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProjectFull, Client, UserBasic } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRESET_COLOURS = [
  "#1B6B3A", "#2D9A5A", "#0891B2", "#0E7490",
  "#6366F1", "#8B5CF6", "#EC4899", "#F97316",
  "#EAB308", "#DC2626", "#1D4ED8", "#92400E",
];

interface TagGroupOption { id: string; name: string }
interface MemberUser { id: string; email: string; full_name: string | null }

interface Props {
  existing?: ProjectFull;
  onClose: () => void;
  onSaved: (project: ProjectFull) => void;
}

export function ProjectCreateEditModal({ existing, onClose, onSaved }: Props) {
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? "");
  const [clientId, setClientId] = useState(existing?.client_id ?? "");
  const [externalId, setExternalId] = useState(existing?.external_id ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [colour, setColour] = useState(existing?.colour ?? "#1B6B3A");
  const [tagGroupId, setTagGroupId] = useState(existing?.tag_group_id ?? "");
  const [budgetHours, setBudgetHours] = useState(existing?.budget_hours?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [tagGroups, setTagGroups] = useState<TagGroupOption[]>([]);
  const [allUsers, setAllUsers] = useState<UserBasic[]>([]);
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    async function fetchMeta() {
      try {
        const [cRes, tgRes, uRes] = await Promise.all([
          fetch("/api/admin/clients"),
          fetch("/api/admin/tag-groups"),
          fetch("/api/admin/users"),
        ]);
        const [cJson, tgJson, uJson] = await Promise.all([
          cRes.json(), tgRes.json(), uRes.json(),
        ]);
        setClients(cJson.data ?? []);
        setTagGroups(tgJson.data ?? []);
        setAllUsers(uJson.data ?? []);

        if (isEdit && existing) {
          const mRes = await fetch(`/api/projects/${existing.id}/members`);
          const mJson = await mRes.json();
          setMembers(mJson.data ?? []);
        }
      } catch {
        toast.error("Failed to load form data.");
      } finally {
        setLoadingMeta(false);
      }
    }
    fetchMeta();
  }, [isEdit, existing]);

  async function handleSave() {
    if (!name.trim()) { toast.error("Project name is required."); return; }
    setSaving(true);
    try {
      const body = {
        name, clientId: clientId || null, externalId: externalId || null,
        description: description || null, colour,
        tagGroupId: tagGroupId || null,
        budgetHours: budgetHours ? parseFloat(budgetHours) : null,
      };
      const res = isEdit
        ? await fetch(`/api/projects/${existing!.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          })
        : await fetch("/api/projects", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed to save."); return; }
      toast.success(isEdit ? "Project updated." : "Project created.");
      onSaved(json.data);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function addMember(u: UserBasic) {
    if (!existing) return;
    const res = await fetch(`/api/projects/${existing.id}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    });
    if (res.ok) setMembers((prev) => [...prev, u]);
    else toast.error("Failed to add member.");
  }

  async function removeMember(userId: string) {
    if (!existing) return;
    const res = await fetch(`/api/projects/${existing.id}/members`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== userId));
    else toast.error("Failed to remove member.");
  }

  const memberIds = new Set(members.map((m) => m.id));
  const filteredUsers = allUsers.filter(
    (u) => !memberIds.has(u.id) &&
      (u.email.includes(memberSearch) || (u.full_name ?? "").toLowerCase().includes(memberSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative flex max-h-[90vh] w-[560px] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-5">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Edit project" : "New project"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loadingMeta ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Name *</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Client + External ID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Client</label>
                <select
                  value={clientId} onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">— None —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">External ID</label>
                <input
                  value={externalId} onChange={(e) => setExternalId(e.target.value)}
                  placeholder="e.g. US-SFM-MCI-DRR-1291"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Tag group + Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Tag group</label>
                <select
                  value={tagGroupId} onChange={(e) => setTagGroupId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">— None —</option>
                  {tagGroups.map((tg) => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Budget (hours)</label>
                <input
                  type="number" min="0" step="0.5"
                  value={budgetHours} onChange={(e) => setBudgetHours(e.target.value)}
                  placeholder="e.g. 200"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                rows={2} placeholder="Optional project description"
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Colour picker */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Colour</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLOURS.map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => setColour(c)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                      colour === c ? "border-gray-900 scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Member management (edit only) */}
            {isEdit && (
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <label className="text-sm font-medium text-gray-700">Team members</label>
                {members.length > 0 && (
                  <div className="space-y-1.5">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-gray-800">{m.full_name ?? m.email}</p>
                          <p className="text-[11px] text-gray-400">{m.email}</p>
                        </div>
                        <button onClick={() => removeMember(m.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="rounded-lg border border-gray-200">
                  <input
                    value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search users to add…"
                    className="w-full rounded-t-lg border-b border-gray-100 px-3 py-2 text-sm outline-none"
                  />
                  <div className="max-h-[120px] overflow-y-auto">
                    {filteredUsers.slice(0, 8).map((u) => (
                      <button
                        key={u.id} type="button" onClick={() => addMember(u)}
                        className="flex w-full items-center gap-2 border-b border-gray-50 px-3 py-2 text-left text-xs hover:bg-gray-50 last:border-b-0"
                      >
                        <Plus className="h-3 w-3 text-gray-400 shrink-0" />
                        <span className="truncate">{u.full_name ?? u.email}</span>
                        <span className="ml-auto text-[10px] text-gray-400 shrink-0">{u.role}</span>
                      </button>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400">No users found.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <button
            onClick={handleSave} disabled={saving || loadingMeta || !name.trim()}
            className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: "#1B6B3A" }}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Save changes" : "Create project"}
          </button>
        </div>
      </div>
    </div>
  );
}
