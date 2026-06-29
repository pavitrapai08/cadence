"use client";

import { useState } from "react";
import { X, Clock } from "lucide-react";
import { toast } from "sonner";

interface WelcomeCardProps {
  onDismiss: () => void;
}

export function WelcomeCard({ onDismiss }: WelcomeCardProps) {
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissedWelcome: true }),
      });
      onDismiss();
    } catch {
      toast.error("Could not save preference — please try again.");
      setDismissing(false);
    }
  }

  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-5 shadow-sm">
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Welcome to Cadence!</h3>
          <p className="text-sm text-muted-foreground">Track the rhythm of your work.</p>
        </div>
      </div>

      <ol className="space-y-2 text-sm">
        {[
          "Select a project from the entry panel",
          "Add a note about what you worked on",
          "Log your hours and save",
        ].map((step, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {i + 1}
            </span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
