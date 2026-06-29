"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  domain: "Only @decisionfoundry.com Google accounts can sign in.",
  auth: "Sign-in failed. Please try again.",
  missing_code: "Sign-in was interrupted. Please try again.",
};

function LoginInner() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const errorKey = params.get("error");
  const error = errorKey ? (ERRORS[errorKey] ?? "Sign-in failed.") : null;
  const envReady = hasSupabaseEnv();

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: "decisionfoundry.com", prompt: "select_account" },
      },
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-brand-foreground font-bold">
          C
        </div>
        <h1 className="text-xl font-semibold">Cadence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track the rhythm of your work.
        </p>

        {error && (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          onClick={signIn}
          disabled={loading || !envReady}
          className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        {!envReady && (
          <p className="mt-3 text-xs text-muted-foreground">
            Supabase env vars not set — see docs/PHASE_0.md.
          </p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          DecisionFoundry Google Workspace accounts only.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
