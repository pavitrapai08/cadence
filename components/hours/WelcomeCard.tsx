"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
    <div className="relative mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <h3 className="mb-1 font-semibold">Welcome to Cadence!</h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Get started in three steps:
      </p>
      <ol className="space-y-1 text-sm">
        <li className="flex items-start gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-medium">
            1
          </span>
          <span>Select a project from the dropdown in a new entry</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-medium">
            2
          </span>
          <span>Add what you worked on</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-medium">
            3
          </span>
          <span>Log your hours</span>
        </li>
      </ol>
    </div>
  );
}
