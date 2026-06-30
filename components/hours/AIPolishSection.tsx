"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, Edit3, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

type PolishState = "idle" | "streaming" | "done";

interface AIPolishSectionProps {
  rawNotes: string;
  projectName: string;
  onAccept: (description: string) => void;
  disabled?: boolean;
}

export function AIPolishSection({
  rawNotes,
  projectName,
  onAccept,
  disabled,
}: AIPolishSectionProps) {
  const [polishState, setPolishState] = useState<PolishState>("idle");
  const [suggestion, setSuggestion] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  async function handlePolish() {
    if (!rawNotes.trim()) return;
    setPolishState("streaming");
    setSuggestion("");
    setEditing(false);

    try {
      const res = await fetch("/api/ai/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes, projectName }),
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? "AI unavailable");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setSuggestion(text);
      }

      setPolishState("done");
    } catch {
      setPolishState("idle");
      toast.error("AI unavailable — try again later.");
    }
  }

  function handleAccept() {
    onAccept(editing ? editText : suggestion);
    setPolishState("idle");
    setSuggestion("");
    setEditing(false);
  }

  function handleEdit() {
    setEditText(suggestion);
    setEditing(true);
  }

  function handleRegenerate() {
    setEditing(false);
    handlePolish();
  }

  function handleDiscard() {
    setPolishState("idle");
    setSuggestion("");
    setEditing(false);
  }

  const isStreaming = polishState === "streaming";

  return (
    <div className="space-y-2">
      {/* Trigger */}
      {polishState === "idle" && (
        <button
          type="button"
          disabled={disabled || !rawNotes.trim()}
          onClick={handlePolish}
          className="flex items-center gap-1.5 text-xs font-medium text-[#1B6B3A] transition-colors hover:text-[#155A30] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Polish with AI
        </button>
      )}

      {/* Streaming / result card */}
      {polishState !== "idle" && (
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-3.5 shadow-sm">
          {/* Card header */}
          <div className="mb-2 flex items-center gap-1.5">
            {isStreaming ? (
              <Loader2 className="h-3 w-3 animate-spin text-[#1B6B3A]" />
            ) : (
              <Sparkles className="h-3 w-3 text-[#1B6B3A]" />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#1B6B3A]">
              {isStreaming ? "Generating…" : "AI suggestion"}
            </span>
          </div>

          {/* Suggestion or edit textarea */}
          {editing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              autoFocus
              className="w-full resize-none rounded-md border border-emerald-200 bg-white px-2.5 py-2 text-sm text-gray-800 outline-none focus:border-[#1B6B3A] focus:ring-1 focus:ring-[#1B6B3A]/20"
            />
          ) : (
            <p className="text-sm leading-relaxed text-gray-800">
              {suggestion}
              {isStreaming && (
                <span className="ml-px inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-gray-500 align-text-bottom" />
              )}
            </p>
          )}

          {/* Actions */}
          {!isStreaming && (
            <div className="mt-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAccept}
                className="flex items-center gap-1 rounded-md bg-[#1B6B3A] px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-[#155A30]"
              >
                <Check className="h-3 w-3" /> Accept
              </button>
              {!editing && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  <Edit3 className="h-3 w-3" /> Edit
                </button>
              )}
              <button
                type="button"
                onClick={handleRegenerate}
                className="flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                <RefreshCw className="h-3 w-3" /> Regenerate
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                title="Discard suggestion"
                className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
