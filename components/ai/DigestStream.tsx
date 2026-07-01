"use client";

import { useState, useRef } from "react";
import { Sparkles, Copy, Check, Loader2, RefreshCw } from "lucide-react";

type StreamState = "idle" | "streaming" | "done" | "error" | "empty";

export function DigestStream() {
  const [state, setState] = useState<StreamState>("idle");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function generate() {
    if (state === "streaming") return;
    setText("");
    setState("streaming");
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const json = await res.json();
        if (json.error?.code === "no_entries") {
          setState("empty");
        } else {
          setState("error");
        }
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setState("error"); return; }

      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setText(accumulated);
      }
      setState(accumulated.trim() ? "done" : "empty");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState("error");
    }
  }

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <Sparkles className="h-4 w-4 text-emerald-600" />
          </div>
          <h2 className="text-sm font-semibold text-gray-900">Your week at a glance</h2>
        </div>
        {(state === "done" || state === "streaming") && (
          <button
            onClick={generate}
            disabled={state === "streaming"}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-3 w-3" />
            Regenerate
          </button>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        {state === "idle" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-gray-400">
              Generate a personal reflection on your work this week.
            </p>
            <button
              onClick={generate}
              className="flex items-center gap-2 rounded-full bg-[#1B6B3A] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#155530] transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate my week
            </button>
          </div>
        )}

        {state === "streaming" && (
          <>
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Writing your digest…
            </div>
            {text && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {text}
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-400" />
              </p>
            )}
          </>
        )}

        {state === "done" && (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{text}</p>
            <button
              onClick={copyText}
              className="mt-auto flex items-center gap-1.5 self-end rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </>
        )}

        {state === "empty" && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-gray-400">Log some hours this week first.</p>
            <button
              onClick={() => setState("idle")}
              className="text-xs text-[#1B6B3A] underline underline-offset-2 hover:text-[#155530]"
            >
              Try again
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-gray-400">AI unavailable — try again later.</p>
            <button
              onClick={generate}
              className="flex items-center gap-2 rounded-full bg-[#1B6B3A] px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#155530] transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
