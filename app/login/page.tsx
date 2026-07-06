"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  domain: "Only @decisionfoundry.com Google accounts can sign in.",
  auth: "Sign-in failed. Please try again.",
  missing_code: "Sign-in was interrupted. Please try again.",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h6a1 1 0 010 2H4a1 1 0 01-1-1z" />
      </svg>
    ),
    title: "Log hours, your way",
    desc: "Calendar view with drag-and-drop. Quick buttons for 15m, 30m, 1h.",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
    ),
    title: "AI-powered polish",
    desc: "Turn rough notes into crisp, professional timesheet entries in one click.",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-4a1 1 0 011-1h2a1 1 0 011 1v13a1 1 0 01-1 1h-2a1 1 0 01-1-1V3z" />
      </svg>
    ),
    title: "Insights that matter",
    desc: "Billable vs non-billable, team utilisation, and your personal weekly digest.",
  },
];

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
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f3d22 0%, #1B6B3A 45%, #2d9a5a 100%)",
        }}
      >
        {/* Decorative mesh circles */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div
            className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-0 right-0 h-[560px] w-[560px] rounded-full opacity-15"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)",
            }}
          />
          {/* Dot-grid overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 text-white font-bold text-lg">
            C
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">
            Cadence
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-8">
          <div className="space-y-4">
            <p className="text-emerald-200/80 text-sm font-medium uppercase tracking-widest">
              DecisionFoundry
            </p>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Track the rhythm<br />of your work.
            </h1>
            <p className="text-emerald-100/75 text-lg leading-relaxed max-w-sm">
              The AI-powered timesheet platform built for every DecisionFoundry team member.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-emerald-200 ring-1 ring-white/10">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-sm text-emerald-100/65 leading-snug mt-0.5">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer note */}
        <p className="relative text-xs text-emerald-100/40">
          Replacing Timely · Powered by Claude AI
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[#f5f7f5] px-6 py-12">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-xl"
            style={{ background: "linear-gradient(135deg, #1B6B3A, #2d9a5a)" }}
          >
            C
          </div>
          <span className="font-semibold text-gray-800 text-lg">Cadence</span>
        </div>

        {/* Card */}
        <div className="w-full max-w-[380px] rounded-2xl bg-white px-8 py-10 shadow-[0_8px_40px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Sign in to your Cadence account
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={signIn}
            disabled={loading || !envReady}
            className="group flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <svg
                className="h-5 w-5 animate-spin text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <GoogleIcon />
            )}
            {loading ? "Redirecting…" : "Continue with Google"}
          </button>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-gray-400">Workspace only</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-gray-400">
            Access restricted to{" "}
            <span className="font-medium text-gray-600">
              @decisionfoundry.com
            </span>{" "}
            Google Workspace accounts.
          </p>

          {!envReady && (
            <p className="mt-3 text-center text-xs text-amber-600">
              Supabase env vars not configured.
            </p>
          )}
        </div>

        <p className="mt-8 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} DecisionFoundry · Cadence v1.0
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
