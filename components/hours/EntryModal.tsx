"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, Copy, ArrowRight, Lock, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HoursInput } from "./HoursInput";
import { TagSelector } from "./TagSelector";
import { AIPolishSection } from "./AIPolishSection";
import { TimeEntry, Project } from "@/lib/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface ModalState {
  mode: "create" | "edit" | "readonly";
  date: string; // "YYYY-MM-DD"
  entry?: TimeEntry;
}

interface EntryModalProps {
  state: ModalState;
  projects: Project[];
  onClose: () => void;
  onSaved: (entry: TimeEntry) => void;
  onDeleted: (id: string) => void;
  onCopy: (entry: TimeEntry, toDate: string) => void;
  onMove: (entry: TimeEntry, toDate: string) => void;
}

export function EntryModal({
  state,
  projects,
  onClose,
  onSaved,
  onDeleted,
  onCopy,
  onMove,
}: EntryModalProps) {
  const existing = state.entry;
  const readonly = state.mode === "readonly";

  const [projectId, setProjectId] = useState(existing?.project_id ?? "");
  const [hours, setHours] = useState(existing?.hours ?? 0);
  const [rawNotes, setRawNotes] = useState(existing?.raw_notes ?? "");
  const [aiDescription, setAiDescription] = useState(existing?.ai_description ?? "");
  const [tagIds, setTagIds] = useState<string[]>(existing?.tag_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [datePrompt, setDatePrompt] = useState<"copy" | "move" | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  const selectedProject = projects.find((p) => p.id === projectId);
  const tags = selectedProject?.tag_group?.tags ?? [];
  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  function handleProjectSelect(id: string) {
    setProjectId(id);
    setTagIds([]);
  }

  async function handleSave() {
    if (!projectId) return toast.error("Please select a project.");
    if (hours <= 0) return toast.error("Please enter valid hours.");
    setSaving(true);
    try {
      const body = {
        projectId,
        date: state.date,
        hours,
        rawNotes: rawNotes || null,
        aiDescription: aiDescription || null,
        tagIds,
      };
      const res = existing
        ? await fetch(`/api/entries/${existing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Failed to save."); return; }
      onSaved(json.data);
      onClose();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!existing) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/entries/${existing.id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); toast.error(j.error?.message ?? "Failed to delete."); return; }
      onDeleted(existing.id);
      onClose();
    } finally { setDeleting(false); }
  }

  async function handleCopyMove() {
    if (!existing || !targetDate) return;
    if (datePrompt === "copy") onCopy(existing, targetDate);
    else onMove(existing, targetDate);
    setDatePrompt(null);
    setTargetDate("");
    onClose();
  }

  const dateLabel = format(new Date(state.date + "T00:00:00"), "EEEE, d MMM yyyy");
  const title = state.mode === "create" ? "New entry" : state.mode === "readonly" ? "Entry" : "Edit entry";

  return (
    /* Full-screen backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      {/* Modal card */}
      <div
        className="relative flex max-h-[90vh] w-[520px] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_25px_60px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{dateLabel}</p>
            {readonly && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
                <Lock className="h-3 w-3" /> This month is locked — read only.
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {datePrompt ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {datePrompt === "copy" ? "Copy to which date?" : "Move to which date?"}
              </p>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDatePrompt(null)}>Back</Button>
                <Button size="sm" disabled={!targetDate} onClick={handleCopyMove}>
                  {datePrompt === "copy" ? "Copy" : "Move"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <Textarea
                  placeholder="What did you work on?"
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  disabled={readonly}
                  rows={3}
                  className="resize-none"
                />
                {aiDescription && (
                  <div className="flex items-start gap-1.5 rounded-lg bg-emerald-50 px-3 py-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1B6B3A]" />
                    <p className="text-sm italic text-gray-700">{aiDescription}</p>
                  </div>
                )}
                {!readonly && (
                  <AIPolishSection
                    rawNotes={rawNotes}
                    projectName={selectedProject?.name ?? ""}
                    onAccept={setAiDescription}
                    disabled={saving}
                  />
                )}
              </div>

              {/* Project */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Project</label>
                {readonly ? (
                  <div className="flex items-center gap-2 text-sm">
                    {selectedProject && (
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selectedProject.colour }} />
                    )}
                    <span>{selectedProject?.name ?? "Unknown"}</span>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    {projects.length > 5 && (
                      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                        <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search projects…"
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                        />
                      </div>
                    )}
                    <div className="max-h-[180px] overflow-y-auto">
                      {filteredProjects.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-400">No projects found.</p>
                      ) : (
                        filteredProjects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProjectSelect(p.id)}
                            className={cn(
                              "flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left text-sm last:border-b-0 transition-colors",
                              projectId === p.id ? "bg-green-50 font-medium" : "hover:bg-gray-50"
                            )}
                          >
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.colour }} />
                            <span className="truncate">{p.name}</span>
                            {projectId === p.id && (
                              <span className="ml-auto text-xs font-semibold text-[#1B6B3A]">✓</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Logged time */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Logged time</label>
                <HoursInput value={hours} onChange={setHours} disabled={readonly} />
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tag</label>
                  <TagSelector tags={tags} selected={tagIds} onChange={setTagIds} disabled={readonly} />
                </div>
              )}

              {/* Copy / Move / Delete */}
              {existing && !readonly && (
                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500" onClick={() => setDatePrompt("copy")}>
                    <Copy className="h-3.5 w-3.5" /> Copy to…
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500" onClick={() => setDatePrompt("move")}>
                    <ArrowRight className="h-3.5 w-3.5" /> Move to…
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="ml-auto gap-1.5 text-destructive hover:text-destructive"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!datePrompt && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <Button variant="outline" onClick={onClose}>
              {readonly ? "Close" : "Cancel"}
            </Button>
            {!readonly && (
              <button
                disabled={saving || !projectId || hours <= 0}
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: "#1B6B3A" }}
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save entry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
