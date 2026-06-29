"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, Copy, ArrowRight, Lock, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HoursInput } from "./HoursInput";
import { TagSelector } from "./TagSelector";
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
  const [aiDescription] = useState(existing?.ai_description ?? "");
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
      if (!res.ok) {
        toast.error(json.error?.message ?? "Failed to save.");
        return;
      }
      onSaved(json.data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/entries/${existing.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        toast.error(j.error?.message ?? "Failed to delete.");
        return;
      }
      onDeleted(existing.id);
      onClose();
    } finally {
      setDeleting(false);
    }
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
  const title =
    state.mode === "create"
      ? "New entry"
      : state.mode === "readonly"
      ? "Entry"
      : "Edit entry";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[480px] p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{dateLabel}</p>
          {readonly && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-1">
              <Lock className="h-3 w-3" /> This entry is locked or submitted — read only.
            </div>
          )}
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {datePrompt ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">
                {datePrompt === "copy" ? "Copy to which date?" : "Move to which date?"}
              </p>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDatePrompt(null)}>
                  Back
                </Button>
                <Button size="sm" disabled={!targetDate} onClick={handleCopyMove}>
                  {datePrompt === "copy" ? "Copy" : "Move"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Notes — first field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notes</label>
                <Textarea
                  placeholder="What did you work on?"
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                  disabled={readonly}
                  rows={3}
                  className="resize-none"
                />
                {aiDescription && (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm italic text-foreground/80">
                    {aiDescription}
                  </p>
                )}
                {!readonly && (
                  <button
                    type="button"
                    disabled
                    title="AI polish coming in Phase 2"
                    className="flex items-center gap-1 text-xs text-muted-foreground opacity-50 cursor-not-allowed"
                  >
                    <Sparkles className="h-3 w-3" /> Polish with AI
                  </button>
                )}
              </div>

              {/* Project */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Project</label>
                {readonly ? (
                  <div className="flex items-center gap-2 text-sm">
                    {selectedProject && (
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: selectedProject.colour }}
                      />
                    )}
                    <span>{selectedProject?.name ?? "Unknown"}</span>
                  </div>
                ) : (
                  <div className="rounded-md border border-border overflow-hidden">
                    {projects.length > 5 && (
                      <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-muted/20">
                        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search projects…"
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    )}
                    <div className="max-h-[180px] overflow-y-auto">
                      {filteredProjects.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No projects found.</p>
                      ) : (
                        filteredProjects.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProjectSelect(p.id)}
                            className={cn(
                              "flex w-full items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors border-b border-border last:border-b-0",
                              projectId === p.id
                                ? "bg-accent font-medium"
                                : "hover:bg-accent/50"
                            )}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.colour }}
                            />
                            <span className="truncate">{p.name}</span>
                            {projectId === p.id && (
                              <span className="ml-auto text-xs text-muted-foreground">✓</span>
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
                <label className="text-sm font-medium text-foreground">Logged time</label>
                <HoursInput value={hours} onChange={setHours} disabled={readonly} />
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Tags</label>
                  <TagSelector tags={tags} selected={tagIds} onChange={setTagIds} disabled={readonly} />
                </div>
              )}

              {/* Copy / Move / Delete */}
              {existing && !readonly && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => setDatePrompt("copy")}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy to…
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => setDatePrompt("move")}
                  >
                    <ArrowRight className="h-3.5 w-3.5" /> Move to…
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive ml-auto"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!datePrompt && (
          <div className="shrink-0 flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" onClick={onClose}>
              {readonly ? "Close" : "Cancel"}
            </Button>
            {!readonly && (
              <Button disabled={saving || !projectId || hours <= 0} onClick={handleSave}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save entry
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
